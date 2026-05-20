import { redirect } from "next/navigation";

import type { Role } from "@/core/auth/roles";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createPlace } from "@/features/places/server/place-actions";
import { PlaceForm } from "@/features/places/components/PlaceForm";
import { createSupabaseAdminClient } from "@/shared/supabase/server";

async function createPlaceFromPage(formData: FormData) {
  "use server";

  await createPlace(formData);
}

type UserRow = { id: string; tenant_id: string; email: string; full_name: string | null };
type RoleRow = { user_id: string; role_id: string };

export default async function NewPlacePage() {
  const session = await createAuthService().requireSession();

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    redirect("/places");
  }

  const admin = createSupabaseAdminClient();
  const [{ data: tenants }, { data: users }, { data: roles }, { data: tags }, { data: forms }] = await Promise.all([
    admin.from("tenants").select("id, name").is("deleted_at", null).order("name"),
    admin.from("users").select("id, tenant_id, email, full_name").is("deleted_at", null).eq("is_active", true),
    admin.from("user_role_assignments").select("user_id, role_id"),
    admin.from("place_tags").select("id, name").order("name"),
    admin
      .from("survey_forms")
      .select("id, tenant_id, name, description, is_active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
  ]);

  const allowedRoles = new Set<Role>(["admin", "manager"]);
  const promoterRoleIds = new Set(
    ((roles as RoleRow[] | null) || [])
      .filter((role) => role.role_id === "promoter")
      .map((role) => role.user_id)
  );
  const representativeIds = new Set(
    ((roles as RoleRow[] | null) || [])
      .filter((role) => allowedRoles.has(role.role_id as Role))
      .map((role) => role.user_id)
  );
  const companies = ((tenants || []) as { id: string; name: string }[]).filter(
    (tenant) => session.roles.includes("admin") || tenant.id === session.user.tenantId
  );
  const representatives = ((users as UserRow[] | null) || [])
    .filter((user) => representativeIds.has(user.id))
    .map((user) => ({
      id: user.id,
      tenantId: user.tenant_id,
      name: user.full_name || user.email,
      email: user.email
    }));
  const promoters = ((users as UserRow[] | null) || [])
    .filter((user) => promoterRoleIds.has(user.id))
    .map((user) => ({
      id: user.id,
      tenantId: user.tenant_id,
      name: user.full_name || user.email,
      email: user.email
    }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Add new place</h1>
      </header>

      <PlaceForm
        action={createPlaceFromPage}
        companies={companies}
        forms={((forms || []) as { id: string; tenant_id: string; name: string; description: string | null; is_active: boolean }[])
          .filter((form) => session.roles.includes("admin") || form.tenant_id === session.user.tenantId)
          .map((form) => ({
            id: form.id,
            tenantId: form.tenant_id,
            name: form.name,
            description: form.description,
            isActive: form.is_active
          }))}
        promoters={promoters}
        representatives={representatives}
        submitLabel="Save"
        tags={((tags || []) as { id: string; name: string }[])}
      />
    </main>
  );
}
