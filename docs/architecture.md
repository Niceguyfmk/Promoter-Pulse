# Architecture

## Layers

`src/app` contains route groups, layouts, pages, and thin route handlers. UI reads from feature hooks and server components. Route handlers validate input, call services, and return typed responses.

`src/features` owns user-facing domains such as auth, promoter shifts, manager dashboards, admin management, and offline sync. Feature modules expose only intentional public APIs.

`src/shared` contains reusable primitives: UI, API response envelopes, validation helpers, offline queue infrastructure, logging, error normalization, and Supabase infrastructure clients.

`src/core` contains portable domain contracts, entities, permissions, and service ports. This layer must not depend on Supabase SDKs or Next.js runtime objects.

## Auth portability

Supabase Auth is an identity provider adapter, not the application user model. The application stores users in `public.users` with:

- `auth_provider`
- `auth_provider_user_id`
- `tenant_id`
- lifecycle and audit columns

All business tables reference `public.users.id`. Auth provider migration to Okta, Auth0, or Azure AD should require adapter changes and identity linking, not broad business schema rewrites.

## Backend extraction

Services are written behind portable contracts so they can move from Next route handlers to a dedicated backend later. Supabase-specific logic is isolated in infrastructure clients and repositories.
