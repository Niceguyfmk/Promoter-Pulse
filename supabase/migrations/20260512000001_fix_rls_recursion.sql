-- Fix RLS recursion in public.users
-- The previous policy called current_app_tenant_id(), which called current_app_user_id(),
-- which queried public.users, triggering the policy again.

-- 1. Drop the recursive policy
drop policy if exists "users can read users in their tenant" on public.users;

-- 2. Add a non-recursive policy for self-read
-- This allows the user to find their own record by matching their Supabase UID
create policy "users can read own record"
on public.users for select
using (
  auth_provider = 'supabase' 
  and auth_provider_user_id = auth.uid()::text
);

-- 3. Add a tenant-based policy that uses a direct check or a non-recursive function
-- To avoid recursion, we can't use current_app_tenant_id() inside a policy for the table it queries
-- unless we are very careful. 
-- However, we can use a subquery that bypasses RLS or just check the ID.

create policy "users can read others in same tenant"
on public.users for select
using (
  tenant_id in (
    select u.tenant_id 
    from public.users u 
    where u.auth_provider = 'supabase' 
    and u.auth_provider_user_id = auth.uid()::text
  )
);

-- 4. Harden current_app_user_id to use session variable as first priority
-- This was already in my previous migration, but let's ensure it's robust.
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
  where u.auth_provider = 'supabase'
    and u.auth_provider_user_id = auth.uid()::text
    and u.deleted_at is null
    and u.is_active = true
  limit 1;

  return v_user_id;
end;
$$;
