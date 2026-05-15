# Promoter Pulse

Promoter Pulse is a mobile-first Next.js + Supabase application for field promoter operations in retail stores.

## Current architecture

### Stack

- Next.js App Router + TypeScript + Tailwind
- Supabase (Auth + Postgres)
- TanStack Query
- PWA shell + service worker + IndexedDB queue primitives

### Project structure

- `src/app`: route groups, pages, layouts, API routes
- `src/features`: domain modules (`auth`, `attendance`, `navigation`, etc.)
- `src/shared`: reusable infrastructure (supabase clients, config, api helpers, offline queue)
- `src/core`: domain-level types/contracts (`roles`, `permissions`, `session`, `errors`)
- `supabase/migrations`: schema + RLS + onboarding trigger logic

### Auth and identity model

- Supabase Auth is the identity provider.
- App ownership of identity is in `public.users`.
- Business relations always point to `public.users.id`.
- Provider link is stored as `(auth_provider, auth_provider_user_id)`.

## Roles and access model

There are only 3 roles:

1. `admin`
- Platform owner/global authority
- Can invite users
- Can assign/change roles
- Has global visibility in the app query layer for core attendance/place views

2. `manager`
- Tenant-scoped operator
- Can manage tenant-level operational data
- Cannot assign/change roles

3. `promoter`
- Default role for new invited users
- Can only access assigned/owned operational data (for example assigned shifts/places)

## Onboarding flow (invite-only)

Public self-signup is disabled for tenant assignment. New users are onboarded only through admin invite.

### How user provisioning works

1. Platform `admin` invites a user from server action.
2. Invite includes tenant metadata (`tenant_id`) in auth metadata.
3. If company is new, tenant is created first; if existing, existing tenant is used.
4. Invited user completes invite/password setup flow.
5. DB trigger `public.handle_new_user()` provisions:
- `public.users` record
- default `promoter` role in `public.user_role_assignments`

Relevant migration:
- `supabase/migrations/20260512190000_invite_only_onboarding.sql`

## Tenant model

- A tenant represents one company/account.
- Tenant key: `public.tenants.id` (`tenant_id` across business tables).
- Places/stores belong to tenants (`retail_stores.tenant_id`), not individual users.

## Navigation tabs and routes

### Primary protected tabs

- `/activities`: activity feed / shift-focused home
- `/places`: places list and place workflows
- `/schedule`: schedule view
- `/reports`: reporting shell

### Mobile navigation behavior

- Bottom mobile nav shows: `Activities`, `Places`, `Schedule`, `Menu`.
- Extra options are grouped under `Menu`.
- Desktop uses sidebar-style navigation; mobile uses fixed bottom navigation.

## Current data visibility behavior

- `admin`: global data access in current attendance/place service queries.
- `manager`: tenant-scoped access.
- `promoter`: assignment-scoped/own-record access.

Note: RLS and query-layer scoping both exist; continue hardening RLS as new modules are added.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill environment values, including `SUPABASE_SERVICE_ROLE_KEY` for admin actions
3. Run `npm install`
4. Run `npm run dev`

## Verification commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`
