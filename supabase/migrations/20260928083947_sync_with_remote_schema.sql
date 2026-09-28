-- Brings the migration history in line with the live Supabase schema.
-- Earlier migrations were applied by hand and the remote drifted from them;
-- this file records what the remote actually has (generated with
-- `supabase db diff --linked`, trimmed to real differences).

-- 1. current_app_user_id(): remote does not check the tenant's is_active /
--    deleted_at (20260512200000_company_active_status.sql added that check,
--    but it was never applied to the remote).
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

drop index if exists public.tenants_is_active_idx;

-- 2. visit_reports update policy: remote only allows draft edits
--    (20260513110000_allow_rejected_visit_report_edits.sql was never applied).
drop policy if exists "promoters can update own draft or rejected visit reports" on public.visit_reports;
drop policy if exists "promoters can update own draft visit reports" on public.visit_reports;
create policy "promoters can update own draft visit reports"
on public.visit_reports for update
using (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
  and status = 'draft'
  and deleted_at is null
)
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
);

-- 3. retail_stores read policy: remote has no deleted_at filter.
drop policy if exists "tenant members can read stores" on public.retail_stores;
create policy "tenant members can read stores"
on public.retail_stores for select
using (tenant_id = (select public.current_app_tenant_id()));

-- 4. Table grants: remote has revoked the default write privileges from
--    `authenticated` on these tables (writes go through the service role).
revoke insert, update, delete on table public.place_company_assignments from authenticated;
revoke insert, update, delete on table public.place_form_assignments from authenticated;
revoke insert, update, delete on table public.place_promoter_assignments from authenticated;
revoke insert, update, delete on table public.place_representative_assignments from authenticated;
revoke insert, update, delete on table public.place_tag_assignments from authenticated;
revoke insert, update, delete on table public.place_tags from authenticated;
revoke insert, update, delete on table public.survey_forms from authenticated;
revoke delete on table public.visit_reports from authenticated;

-- 5. Default privileges for objects postgres creates in public: remote grants
--    anon/authenticated/service_role nothing on new sequences and functions, and
--    only REFERENCES, TRIGGER, TRUNCATE, MAINTAIN on new tables. New objects
--    therefore need explicit GRANTs in their own migration.
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
