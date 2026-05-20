create table if not exists public.survey_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.place_form_assignments (
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, form_id)
);

alter table public.visit_reports
add column if not exists form_id uuid references public.survey_forms(id);

create index if not exists survey_forms_tenant_active_idx
on public.survey_forms(tenant_id, is_active, updated_at desc)
where deleted_at is null;

create index if not exists place_form_assignments_form_id_idx
on public.place_form_assignments(form_id);

create index if not exists visit_reports_form_id_idx
on public.visit_reports(form_id);

alter table public.survey_forms enable row level security;
alter table public.place_form_assignments enable row level security;

drop policy if exists "tenant members can read survey forms" on public.survey_forms;
create policy "tenant members can read survey forms"
on public.survey_forms for select
using (
  tenant_id = public.current_app_tenant_id()
  and deleted_at is null
);

drop policy if exists "admins can manage survey forms" on public.survey_forms;
create policy "admins can manage survey forms"
on public.survey_forms for all
using (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
)
with check (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
);

drop policy if exists "tenant members can read place form assignments" on public.place_form_assignments;
create policy "tenant members can read place form assignments"
on public.place_form_assignments for select
using (
  exists (
    select 1
    from public.retail_stores s
    join public.survey_forms f on f.id = place_form_assignments.form_id
    where s.id = place_form_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
      and f.tenant_id = public.current_app_tenant_id()
      and f.deleted_at is null
  )
);

drop policy if exists "admins can manage place form assignments" on public.place_form_assignments;
create policy "admins can manage place form assignments"
on public.place_form_assignments for all
using (
  exists (
    select 1
    from public.retail_stores s
    join public.survey_forms f on f.id = place_form_assignments.form_id
    where s.id = place_form_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
      and f.tenant_id = public.current_app_tenant_id()
      and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
      and f.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.retail_stores s
    join public.survey_forms f on f.id = place_form_assignments.form_id
    where s.id = place_form_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
      and f.tenant_id = public.current_app_tenant_id()
      and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
      and f.deleted_at is null
  )
);

revoke all on table public.survey_forms from anon;
revoke all on table public.place_form_assignments from anon;

grant select on table public.survey_forms to authenticated;
grant select on table public.place_form_assignments to authenticated;

grant all privileges on table public.survey_forms to service_role;
grant all privileges on table public.place_form_assignments to service_role;
