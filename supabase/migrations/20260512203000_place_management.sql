alter table public.tenants
add column if not exists is_active boolean not null default true;

alter table public.retail_stores
add column if not exists is_active boolean not null default true,
add column if not exists status text,
add column if not exists city text,
add column if not exists state text,
add column if not exists postal_code text,
add column if not exists country text,
add column if not exists country_code text,
add column if not exists contact_name text,
add column if not exists contact_title text,
add column if not exists contact_email text,
add column if not exists website text,
add column if not exists phone text,
add column if not exists cell_phone text,
add column if not exists note text;

create table if not exists public.place_company_assignments (
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, tenant_id)
);

create table if not exists public.place_representative_assignments (
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table if not exists public.place_promoter_assignments (
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table if not exists public.place_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.place_tag_assignments (
  store_id uuid not null references public.retail_stores(id) on delete cascade,
  tag_id uuid not null references public.place_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, tag_id)
);

create index if not exists retail_stores_is_active_idx on public.retail_stores(is_active);
create unique index if not exists place_company_assignments_one_company_per_store_idx
on public.place_company_assignments(store_id);
create index if not exists place_company_assignments_tenant_id_idx on public.place_company_assignments(tenant_id);
create index if not exists place_representative_assignments_user_id_idx on public.place_representative_assignments(user_id);
create index if not exists place_promoter_assignments_user_id_idx on public.place_promoter_assignments(user_id);

alter table public.place_company_assignments enable row level security;
alter table public.place_representative_assignments enable row level security;
alter table public.place_promoter_assignments enable row level security;
alter table public.place_tags enable row level security;
alter table public.place_tag_assignments enable row level security;

drop policy if exists "tenant members can read place companies" on public.place_company_assignments;
create policy "tenant members can read place companies"
on public.place_company_assignments for select
using (tenant_id = public.current_app_tenant_id());

drop policy if exists "admins can manage place companies" on public.place_company_assignments;
create policy "admins can manage place companies"
on public.place_company_assignments for all
using (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
with check (public.current_app_has_role('admin') or public.current_app_has_role('manager'));

drop policy if exists "tenant members can read place representatives" on public.place_representative_assignments;
create policy "tenant members can read place representatives"
on public.place_representative_assignments for select
using (
  exists (
    select 1
    from public.retail_stores s
    where s.id = place_representative_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
  )
);

drop policy if exists "admins can manage place representatives" on public.place_representative_assignments;
create policy "admins can manage place representatives"
on public.place_representative_assignments for all
using (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
with check (public.current_app_has_role('admin') or public.current_app_has_role('manager'));

drop policy if exists "assigned promoters can read place promoter assignments" on public.place_promoter_assignments;
create policy "assigned promoters can read place promoter assignments"
on public.place_promoter_assignments for select
using (
  user_id = public.current_app_user_id()
  or exists (
    select 1
    from public.retail_stores s
    where s.id = place_promoter_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
      and (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
  )
);

drop policy if exists "admins can manage place promoter assignments" on public.place_promoter_assignments;
create policy "admins can manage place promoter assignments"
on public.place_promoter_assignments for all
using (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
with check (public.current_app_has_role('admin') or public.current_app_has_role('manager'));

drop policy if exists "authenticated users can read place tags" on public.place_tags;
create policy "authenticated users can read place tags"
on public.place_tags for select
using (auth.uid() is not null);

drop policy if exists "admins can manage place tags" on public.place_tags;
create policy "admins can manage place tags"
on public.place_tags for all
using (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
with check (public.current_app_has_role('admin') or public.current_app_has_role('manager'));

drop policy if exists "tenant members can read place tag assignments" on public.place_tag_assignments;
create policy "tenant members can read place tag assignments"
on public.place_tag_assignments for select
using (
  exists (
    select 1
    from public.retail_stores s
    where s.id = place_tag_assignments.store_id
      and s.tenant_id = public.current_app_tenant_id()
  )
);

drop policy if exists "admins can manage place tag assignments" on public.place_tag_assignments;
create policy "admins can manage place tag assignments"
on public.place_tag_assignments for all
using (public.current_app_has_role('admin') or public.current_app_has_role('manager'))
with check (public.current_app_has_role('admin') or public.current_app_has_role('manager'));

-- Grant necessary privileges. Server actions use service_role for writes; browser clients only need reads.
revoke all on table public.place_company_assignments from anon;
revoke all on table public.place_representative_assignments from anon;
revoke all on table public.place_promoter_assignments from anon;
revoke all on table public.place_tags from anon;
revoke all on table public.place_tag_assignments from anon;

grant select on table public.place_company_assignments to authenticated;
grant select on table public.place_representative_assignments to authenticated;
grant select on table public.place_promoter_assignments to authenticated;
grant select on table public.place_tags to authenticated;
grant select on table public.place_tag_assignments to authenticated;

grant all privileges on table public.place_company_assignments to service_role;
grant all privileges on table public.place_representative_assignments to service_role;
grant all privileges on table public.place_promoter_assignments to service_role;
grant all privileges on table public.place_tags to service_role;
grant all privileges on table public.place_tag_assignments to service_role;
