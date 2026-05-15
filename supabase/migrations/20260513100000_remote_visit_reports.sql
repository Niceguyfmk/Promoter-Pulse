create table if not exists public.visit_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id) on delete cascade,
  check_in_type text not null default 'remote',
  status text not null default 'draft',
  started_at timestamptz not null default now(),
  checked_out_at timestamptz,
  form_name text,
  form_answers jsonb not null default '{}'::jsonb,
  photo_items jsonb not null default '[]'::jsonb,
  note text,
  sales_numbers jsonb not null default '{}'::jsonb,
  merchandising jsonb not null default '{}'::jsonb,
  reviewed_by_user_id uuid references public.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint visit_reports_check_in_type_check check (check_in_type in ('remote', 'gps')),
  constraint visit_reports_status_check check (status in ('draft', 'submitted', 'accepted', 'rejected'))
);

create unique index if not exists visit_reports_one_open_remote_per_promoter_store_idx
on public.visit_reports(promoter_user_id, store_id)
where status = 'draft' and deleted_at is null;

create index if not exists visit_reports_tenant_status_idx
on public.visit_reports(tenant_id, status, started_at desc);

create index if not exists visit_reports_promoter_idx
on public.visit_reports(promoter_user_id, started_at desc);

alter table public.visit_reports enable row level security;

drop policy if exists "promoters can read own visit reports" on public.visit_reports;
create policy "promoters can read own visit reports"
on public.visit_reports for select
using (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
  and deleted_at is null
);

drop policy if exists "managers can read tenant visit reports" on public.visit_reports;
create policy "managers can read tenant visit reports"
on public.visit_reports for select
using (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
  and deleted_at is null
);

drop policy if exists "promoters can create own visit reports" on public.visit_reports;
create policy "promoters can create own visit reports"
on public.visit_reports for insert
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
  and check_in_type = 'remote'
);

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

drop policy if exists "managers can review submitted visit reports" on public.visit_reports;
create policy "managers can review submitted visit reports"
on public.visit_reports for update
using (
  tenant_id = public.current_app_tenant_id()
  and status = 'submitted'
  and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
  and deleted_at is null
)
with check (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
);

revoke all on table public.visit_reports from anon;
grant select, insert, update on table public.visit_reports to authenticated;
grant all privileges on table public.visit_reports to service_role;
