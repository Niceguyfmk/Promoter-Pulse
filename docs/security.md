# Security Model

## Tenancy

Tenant ownership is stored explicitly on tenant-scoped rows. RLS policies compare row tenant ids to memberships for the current application user. Foreign keys are indexed.

## RBAC

Roles and permissions are application-owned tables. JWT claims can be used as optimization hints later, but authorization decisions should resolve through application users, memberships, roles, and permissions.

## Provider-portable identity

Provider identity is stored as `(auth_provider, auth_provider_user_id)`. Application relations use `public.users.id`. No business relation should reference `auth.users.id`.

## Uploads

Photo uploads must use short-lived signed URLs generated server-side after authorization and quota checks. Clients never receive privileged storage keys.

## Audit logging

Sensitive mutations should insert audit events containing tenant id, actor user id, action, target type, target id, request id, and metadata.
