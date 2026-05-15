-- Enable the sync between auth.users and public.users
-- This ensures that every Supabase Auth user has a corresponding application user and tenant.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tenant_id uuid;
    v_tenant_name text;
    v_role public.app_role;
    v_full_name text;
begin
    -- 1. Resolve Tenant
    -- Try to get tenant_id from metadata (for invites/assignments)
    v_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
    
    if v_tenant_id is null then
        -- If no tenant_id, we create a new one (Self-serve signup)
        v_tenant_name := coalesce(new.raw_user_meta_data->>'tenant_name', split_part(new.email, '@', 1) || ' Default');
        
        insert into public.tenants (name, slug)
        values (v_tenant_name, lower(regexp_replace(v_tenant_name, '[^a-zA-Z0-0]+', '-', 'g')) || '-' || encode(gen_random_bytes(3), 'hex'))
        returning id into v_tenant_id;
        
        v_role := 'admin';
    else
        -- If tenant_id was provided, we assume a lower role unless specified
        v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'promoter');
    end if;

    -- 2. Create Public User
    v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
    
    insert into public.users (
        tenant_id,
        auth_provider,
        auth_provider_user_id,
        email,
        full_name
    )
    values (
        v_tenant_id,
        'supabase',
        new.id::text,
        new.email,
        v_full_name
    )
    on conflict (auth_provider, auth_provider_user_id) do update
    set 
        email = excluded.email,
        full_name = coalesce(excluded.full_name, users.full_name),
        updated_at = now();

    -- 3. Assign Role
    insert into public.user_role_assignments (tenant_id, user_id, role_id)
    select v_tenant_id, u.id, v_role
    from public.users u
    where u.auth_provider = 'supabase' and u.auth_provider_user_id = new.id::text
    on conflict do nothing;

    return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Improve current_app_user_id to be more portable and robust
create or replace function public.current_app_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Try to get from session setting (useful for background jobs or other providers)
  v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
  
  if v_user_id is not null then
    return v_user_id;
  end if;

  -- Fallback to Supabase Auth
  select u.id into v_user_id
  from public.users u
  where u.auth_provider = 'supabase'
    and u.auth_provider_user_id = auth.uid()::text
    and u.deleted_at is null
    and u.is_active = true
  limit 1;

  return v_user_id;
end;
$$;

-- Enforcement triggers for tenant consistency
create or replace function public.enforce_tenant_consistency()
returns trigger
language plpgsql
as $$
begin
  -- For shifts: store and promoter must belong to the same tenant as the shift
  if tg_table_name = 'shifts' then
    if not exists (select 1 from public.retail_stores s where s.id = new.store_id and s.tenant_id = new.tenant_id) then
      raise exception 'Store does not belong to the same tenant as the shift';
    end if;
    if not exists (select 1 from public.users u where u.id = new.promoter_user_id and u.tenant_id = new.tenant_id) then
      raise exception 'Promoter does not belong to the same tenant as the shift';
    end if;
  end if;

  -- For child tables (counters, audits, photos): must match shift tenant
  if tg_table_name in ('activity_counters', 'store_audits', 'photo_uploads') then
    if not exists (select 1 from public.shifts s where s.id = new.shift_id and s.tenant_id = new.tenant_id) then
      raise exception 'Referenced shift does not belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_shifts_tenant_consistency
  before insert or update on public.shifts
  for each row execute procedure public.enforce_tenant_consistency();

create trigger enforce_counters_tenant_consistency
  before insert or update on public.activity_counters
  for each row execute procedure public.enforce_tenant_consistency();

create trigger enforce_audits_tenant_consistency
  before insert or update on public.store_audits
  for each row execute procedure public.enforce_tenant_consistency();

create trigger enforce_photos_tenant_consistency
  before insert or update on public.photo_uploads
  for each row execute procedure public.enforce_tenant_consistency();
