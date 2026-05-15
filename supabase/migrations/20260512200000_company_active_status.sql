alter table public.tenants
add column if not exists is_active boolean not null default true;

create index if not exists tenants_is_active_idx on public.tenants(is_active);

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
  v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
  
  if v_user_id is not null then
    return v_user_id;
  end if;

  select u.id into v_user_id
  from public.users u
  join public.tenants t on t.id = u.tenant_id
  where u.auth_provider = 'supabase'
    and u.auth_provider_user_id = auth.uid()::text
    and u.deleted_at is null
    and u.is_active = true
    and t.deleted_at is null
    and t.is_active = true
  limit 1;

  return v_user_id;
end;
$$;
