"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppError } from "@/core/errors/app-error";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import { createAuthService } from "./app-auth-service";
import type { Role } from "@/core/auth/roles";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: error.message };
  }

  const session = await createAuthService().getSession();

  if (!session) {
    await supabase.auth.signOut();
    return { error: "Your user or company is inactive." };
  }

  redirect("/");
}

export async function signUp() {
  return {
    error:
      "Direct signup is disabled. Ask a platform admin to invite you to your company tenant."
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function requirePlatformAdmin() {
  const session = await createAuthService().requireSession();
  if (!session.roles.includes("admin")) {
    throw new AppError("FORBIDDEN", "Only platform admin can perform this action");
  }
  return session;
}

export async function inviteUser(formData: FormData) {
  try {
    await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const fullName = (formData.get("fullName") as string)?.trim();
    const company = (formData.get("company") as string)?.trim();

    if (!email || !fullName || !company) {
      return { error: "Email, full name, and company are required." };
    }

    const { data: existingTenant } = await admin
      .from("tenants")
      .select("id, slug")
      .ilike("name", company)
      .is("deleted_at", null)
      .maybeSingle();

    let tenantId = existingTenant?.id;

    if (!tenantId) {
      const slugBase = company
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

      const { data: createdTenant, error: createTenantError } = await admin
        .from("tenants")
        .insert({ name: company, slug })
        .select("id")
        .single();

      if (createTenantError || !createdTenant) {
        return { error: "Failed to create tenant for invite." };
      }

      tenantId = createdTenant.id;
    }

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        tenant_id: tenantId
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/activities`
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invite failed" };
  }
}

export async function updateUserRole(formData: FormData) {
  try {
    await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const userId = formData.get("userId") as string;
    const role = formData.get("role") as Role;

    if (!userId || !role || !["admin", "manager", "promoter"].includes(role)) {
      return { error: "Valid user id and role are required." };
    }

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, tenant_id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { error: "User not found." };
    }

    const { error: deleteError } = await admin
      .from("user_role_assignments")
      .delete()
      .eq("user_id", user.id)
      .eq("tenant_id", user.tenant_id);

    if (deleteError) {
      return { error: "Failed to clear existing roles." };
    }

    const { error: insertError } = await admin.from("user_role_assignments").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      role_id: role
    });

    if (insertError) {
      return { error: "Failed to assign role." };
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Role update failed" };
  }
}

export async function updateUserActiveStatus(formData: FormData) {
  try {
    const session = await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const userId = formData.get("userId") as string;
    const isActive = formData.get("isActive") === "true";

    if (!userId) {
      return { error: "User id is required." };
    }

    if (userId === session.user.id && !isActive) {
      return { error: "You cannot deactivate your own user account." };
    }

    const { error } = await admin
      .from("users")
      .update({
        is_active: isActive
      })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) {
      return { error: "Failed to update user status." };
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Status update failed" };
  }
}

export async function deleteUser(formData: FormData) {
  try {
    const session = await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const userId = formData.get("userId") as string;

    if (!userId) {
      return { error: "User id is required." };
    }

    if (userId === session.user.id) {
      return { error: "You cannot delete your own user account." };
    }

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, tenant_id, auth_provider, auth_provider_user_id")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (userError || !user) {
      return { error: "User not found." };
    }

    const { error: roleError } = await admin
      .from("user_role_assignments")
      .delete()
      .eq("user_id", user.id)
      .eq("tenant_id", user.tenant_id);

    if (roleError) {
      return { error: "Failed to remove user roles." };
    }

    const { error: deleteError } = await admin.from("users").delete().eq("id", user.id);

    if (deleteError) {
      return { error: "Failed to delete user. This user may still be referenced by operational records." };
    }

    if (user.auth_provider === "supabase") {
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.auth_provider_user_id);

      if (authDeleteError) {
        return { error: authDeleteError.message };
      }
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "User delete failed" };
  }
}

export async function updateCompany(formData: FormData) {
  try {
    await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const companyId = formData.get("companyId") as string;
    const name = (formData.get("name") as string)?.trim();

    if (!companyId || !name) {
      return { error: "Company id and name are required." };
    }

    const slugBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { error } = await admin
      .from("tenants")
      .update({
        name,
        slug: slugBase || companyId,
        updated_at: new Date().toISOString()
      })
      .eq("id", companyId)
      .is("deleted_at", null);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/companies");
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Company update failed" };
  }
}

export async function updateCompanyActiveStatus(formData: FormData) {
  try {
    const session = await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const companyId = formData.get("companyId") as string;
    const isActive = formData.get("isActive") === "true";

    if (!companyId) {
      return { error: "Company id is required." };
    }

    if (companyId === session.user.tenantId && !isActive) {
      return { error: "You cannot deactivate your own company." };
    }

    const { error } = await admin
      .from("tenants")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq("id", companyId)
      .is("deleted_at", null);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/companies");
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Company status update failed" };
  }
}

export async function deleteCompany(formData: FormData) {
  try {
    const session = await requirePlatformAdmin();
    const admin = createSupabaseAdminClient();

    const companyId = formData.get("companyId") as string;

    if (!companyId) {
      return { error: "Company id is required." };
    }

    if (companyId === session.user.tenantId) {
      return { error: "You cannot delete your own company." };
    }

    const { data: company, error: companyError } = await admin
      .from("tenants")
      .select("id")
      .eq("id", companyId)
      .is("deleted_at", null)
      .single();

    if (companyError || !company) {
      return { error: "Company not found." };
    }

    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, auth_provider, auth_provider_user_id")
      .eq("tenant_id", company.id)
      .is("deleted_at", null);

    if (usersError) {
      return { error: "Failed to load company users." };
    }

    const userIds = (users || []).map((user) => user.id);

    if (userIds.length) {
      const { error: rolesError } = await admin
        .from("user_role_assignments")
        .delete()
        .in("user_id", userIds);

      if (rolesError) {
        return { error: "Failed to delete company user roles." };
      }

      const { error: usersDeleteError } = await admin.from("users").delete().in("id", userIds);

      if (usersDeleteError) {
        return {
          error:
            "Failed to delete company users. One or more users may still be referenced by operational records."
        };
      }

      for (const user of users || []) {
        if (user.auth_provider === "supabase") {
          const { error: authDeleteError } = await admin.auth.admin.deleteUser(
            user.auth_provider_user_id
          );

          if (authDeleteError) {
            return { error: authDeleteError.message };
          }
        }
      }
    }

    const { error: deleteError } = await admin.from("tenants").delete().eq("id", company.id);

    if (deleteError) {
      return {
        error:
          "Failed to delete company. It may still be referenced by places, shifts, audits, or other operational records."
      };
    }

    revalidatePath("/companies");
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Company delete failed" };
  }
}
