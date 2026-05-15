import "server-only";

import { AppError } from "@/core/errors/app-error";
import type { ApplicationUser } from "@/core/auth/session";
import type { Role } from "@/core/auth/roles";
import type { Permission } from "@/core/auth/permissions";
import type { ProviderIdentity } from "@/core/auth/auth-provider";
import { createSupabaseAdminClient } from "@/shared/supabase/server";

export type ResolvedApplicationUser = {
  user: ApplicationUser;
  roles: Role[];
  permissions: Permission[];
};

import { cache } from "react";

export const findApplicationUserByIdentity = cache(
  async (identity: ProviderIdentity): Promise<ResolvedApplicationUser | null> => {
  const supabase = createSupabaseAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, tenant_id, auth_provider, auth_provider_user_id, email, full_name, is_active")
    .eq("auth_provider", identity.provider)
    .eq("auth_provider_user_id", identity.providerUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[UserRepository] Identity resolution failed:", error);
    throw new AppError("INTERNAL_ERROR", "Unable to resolve application user", error);
  }

  if (!user) {
    return null;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("is_active")
    .eq("id", user.tenant_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (tenantError) {
    if (tenantError.code === "42703") {
      console.warn(
        "[UserRepository] tenants.is_active is missing. Run the latest Supabase migration to enable company status checks."
      );
    } else {
    throw new AppError("INTERNAL_ERROR", "Unable to resolve application tenant", tenantError);
    }
  }

  if (tenant && !tenant.is_active) {
    return null;
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_role_assignments")
    .select("role_id")
    .eq("user_id", user.id)
    .eq("tenant_id", user.tenant_id);

  if (rolesError) {
    throw new AppError("INTERNAL_ERROR", "Unable to resolve application roles", rolesError);
  }

  const roleIds = roles.map((r) => r.role_id as Role);

  const { data: permissions, error: permsError } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds);

  if (permsError) {
    throw new AppError("INTERNAL_ERROR", "Unable to resolve application permissions", permsError);
  }

  return {
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      fullName: user.full_name,
      authProvider: user.auth_provider as ApplicationUser["authProvider"],
      authProviderUserId: user.auth_provider_user_id,
      isActive: user.is_active
    },
    roles: roleIds,
    permissions: permissions.map((p) => p.permission_id as Permission)
  };
});
