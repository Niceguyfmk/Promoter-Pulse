create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.auth_provider as enum ('supabase', 'okta', 'auth0', 'azure_ad');
create type public.app_role as enum ('admin', 'manager', 'promoter');
create type public.shift_status as enum ('scheduled', 'checked_in', 'checked_out', 'missed');
create type public.audit_action as enum (
  'auth.session_resolved',
  'shift.check_in',
  'shift.check_out',
  'photo.signed_upload_requested',
  'admin.user_updated'
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  auth_provider public.auth_provider not null,
  auth_provider_user_id text not null,
  email citext not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (auth_provider, auth_provider_user_id),
  unique (tenant_id, email)
);

create table public.roles (
  id public.app_role primary key,
  description text not null
);

create table public.permissions (
  id text primary key,
  description text not null
);

create table public.role_permissions (
  role_id public.app_role not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_role_assignments (
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id public.app_role not null references public.roles(id),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id, role_id)
);

create table public.retail_stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  external_code text,
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  geofence_radius_meters integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  promoter_user_id uuid not null references public.users(id),
  store_id uuid not null references public.retail_stores(id),
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  status public.shift_status not null default 'scheduled',
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  check_in_latitude numeric(9, 6),
  check_in_longitude numeric(9, 6),
  check_out_latitude numeric(9, 6),
  check_out_longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (scheduled_end_at > scheduled_start_at)
);

create table public.activity_counters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id),
  counter_key text not null,
  counter_value integer not null default 0,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (shift_id, counter_key)
);

create table public.store_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  promoter_user_id uuid not null references public.users(id),
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.photo_uploads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  uploaded_by_user_id uuid not null references public.users(id),
  storage_bucket text not null,
  storage_path text not null,
  content_type text not null,
  size_bytes integer not null,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, storage_path)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid references public.users(id),
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  actor_user_id uuid references public.users(id),
  action public.audit_action not null,
  target_type text not null,
  target_id uuid,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.roles (id, description)
values
  ('admin', 'Tenant administrator'),
  ('manager', 'Field manager'),
  ('promoter', 'Retail field promoter');

insert into public.permissions (id, description)
values
  ('attendance:read', 'Read attendance'),
  ('attendance:write', 'Write attendance'),
  ('audits:read', 'Read audits'),
  ('audits:write', 'Write audits'),
  ('photos:read', 'Read photos'),
  ('photos:write', 'Write photos'),
  ('reports:read', 'Read reports'),
  ('users:manage', 'Manage users'),
  ('tenant:manage', 'Manage tenant');

insert into public.role_permissions (role_id, permission_id)
values
  ('admin', 'attendance:read'),
  ('admin', 'attendance:write'),
  ('admin', 'audits:read'),
  ('admin', 'audits:write'),
  ('admin', 'photos:read'),
  ('admin', 'photos:write'),
  ('admin', 'reports:read'),
  ('admin', 'users:manage'),
  ('admin', 'tenant:manage'),
  ('manager', 'attendance:read'),
  ('manager', 'audits:read'),
  ('manager', 'photos:read'),
  ('manager', 'reports:read'),
  ('promoter', 'attendance:write'),
  ('promoter', 'audits:write'),
  ('promoter', 'photos:write');

create index users_tenant_id_idx on public.users(tenant_id);
create index users_provider_identity_idx on public.users(auth_provider, auth_provider_user_id);
create index user_role_assignments_user_id_idx on public.user_role_assignments(user_id);
create index retail_stores_tenant_id_idx on public.retail_stores(tenant_id);
create index shifts_tenant_id_idx on public.shifts(tenant_id);
create index shifts_promoter_user_id_idx on public.shifts(promoter_user_id);
create index shifts_store_id_idx on public.shifts(store_id);
create index activity_counters_shift_id_idx on public.activity_counters(shift_id);
create index store_audits_shift_id_idx on public.store_audits(shift_id);
create index photo_uploads_shift_id_idx on public.photo_uploads(shift_id);
create index activity_events_tenant_id_idx on public.activity_events(tenant_id);
create index audit_logs_tenant_id_created_at_idx on public.audit_logs(tenant_id, created_at desc);

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_provider = 'supabase'
    and u.auth_provider_user_id = auth.uid()::text
    and u.deleted_at is null
    and u.is_active = true
  limit 1
$$;

create or replace function public.current_app_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.tenant_id
  from public.users u
  where u.id = public.current_app_user_id()
  limit 1
$$;

create or replace function public.current_app_has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = public.current_app_user_id()
      and ura.tenant_id = public.current_app_tenant_id()
      and ura.role_id = required_role
  )
$$;

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.retail_stores enable row level security;
alter table public.shifts enable row level security;
alter table public.activity_counters enable row level security;
alter table public.store_audits enable row level security;
alter table public.photo_uploads enable row level security;
alter table public.activity_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "tenant members can read their tenant"
on public.tenants for select
using (id = public.current_app_tenant_id() and deleted_at is null);

create policy "users can read users in their tenant"
on public.users for select
using (tenant_id = public.current_app_tenant_id() and deleted_at is null);

create policy "admins can manage tenant users"
on public.users for update
using (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'))
with check (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'));

create policy "authenticated users can read role catalog"
on public.roles for select
using (public.current_app_user_id() is not null);

create policy "authenticated users can read permission catalog"
on public.permissions for select
using (public.current_app_user_id() is not null);

create policy "authenticated users can read role permissions"
on public.role_permissions for select
using (public.current_app_user_id() is not null);

create policy "tenant members can read role assignments"
on public.user_role_assignments for select
using (tenant_id = public.current_app_tenant_id());

create policy "admins can manage role assignments"
on public.user_role_assignments for all
using (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'))
with check (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'));

create policy "tenant members can read stores"
on public.retail_stores for select
using (tenant_id = public.current_app_tenant_id() and deleted_at is null);

create policy "admins can manage stores"
on public.retail_stores for all
using (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'))
with check (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'));

create policy "tenant members can read shifts"
on public.shifts for select
using (tenant_id = public.current_app_tenant_id() and deleted_at is null);

create policy "promoters can update their own shifts"
on public.shifts for update
using (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
)
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
);

create policy "managers can manage shifts"
on public.shifts for all
using (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('manager') or public.current_app_has_role('admin'))
)
with check (
  tenant_id = public.current_app_tenant_id()
  and (public.current_app_has_role('manager') or public.current_app_has_role('admin'))
);

create policy "tenant members can read activity counters"
on public.activity_counters for select
using (tenant_id = public.current_app_tenant_id());

create policy "promoters can write own activity counters"
on public.activity_counters for insert
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
);

create policy "tenant members can read audits"
on public.store_audits for select
using (tenant_id = public.current_app_tenant_id());

create policy "promoters can submit own audits"
on public.store_audits for insert
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
);

create policy "tenant members can read photos"
on public.photo_uploads for select
using (tenant_id = public.current_app_tenant_id() and deleted_at is null);

create policy "promoters can register own photos"
on public.photo_uploads for insert
with check (
  tenant_id = public.current_app_tenant_id()
  and uploaded_by_user_id = public.current_app_user_id()
);

create policy "tenant members can read activity events"
on public.activity_events for select
using (tenant_id = public.current_app_tenant_id());

create policy "tenant members can write activity events"
on public.activity_events for insert
with check (tenant_id = public.current_app_tenant_id());

create policy "admins can read audit logs"
on public.audit_logs for select
using (tenant_id = public.current_app_tenant_id() and public.current_app_has_role('admin'));

create policy "tenant members can write audit logs"
on public.audit_logs for insert
with check (tenant_id = public.current_app_tenant_id());
