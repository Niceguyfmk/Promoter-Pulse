-- Enforce invite-driven onboarding:
-- - No public self-serve tenant creation inside auth trigger
-- - New auth users must carry a tenant_id in metadata (set by admin invite)
-- - Default role is always promoter

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tenant_id uuid;
    v_full_name text;
    v_user_id uuid;
begin
    v_tenant_id := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;

    if v_tenant_id is null then
        raise exception 'Invite metadata missing tenant_id for user %', new.email;
    end if;

    if not exists (select 1 from public.tenants t where t.id = v_tenant_id and t.deleted_at is null) then
        raise exception 'Invalid tenant_id in invite metadata for user %', new.email;
    end if;

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
      tenant_id = excluded.tenant_id,
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.users.full_name),
      updated_at = now()
    returning id into v_user_id;

    insert into public.user_role_assignments (tenant_id, user_id, role_id)
    values (v_tenant_id, v_user_id, 'promoter')
    on conflict do nothing;

    return new;
end;
$$;
