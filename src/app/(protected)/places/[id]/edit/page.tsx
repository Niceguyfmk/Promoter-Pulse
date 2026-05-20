import { notFound, redirect } from "next/navigation";

import type { Role } from "@/core/auth/roles";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { PlaceForm } from "@/features/places/components/PlaceForm";
import { updatePlace } from "@/features/places/server/place-actions";
import { createSupabaseAdminClient } from "@/shared/supabase/server";

async function updatePlaceFromPage(formData: FormData) {
  "use server";

  await updatePlace(formData);
}

type UserRow = { id: string; tenant_id: string; email: string; full_name: string | null };
type RoleRow = { user_id: string; role_id: string };
type StoreRow = {
  id: string;
  name: string;
  external_code: string | null;
  is_active: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  website: string | null;
  phone: string | null;
  cell_phone: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number | null;
  geofence_radius_meters: number;
};

export default async function EditPlacePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, createAuthService().requireSession()]);

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    redirect("/places");
  }

  const admin = createSupabaseAdminClient();
  const [
    { data: store },
    { data: tenants },
    { data: users },
    { data: roles },
    { data: tags },
    { data: forms },
    { data: companyAssignments },
    { data: promoterAssignments },
    { data: representativeAssignments },
    { data: tagAssignments },
    { data: formAssignments }
  ] = await Promise.all([
    admin.from("retail_stores").select("*").eq("id", id).single(),
    admin.from("tenants").select("id, name").is("deleted_at", null).order("name"),
    admin.from("users").select("id, tenant_id, email, full_name").is("deleted_at", null).eq("is_active", true),
    admin.from("user_role_assignments").select("user_id, role_id"),
    admin.from("place_tags").select("id, name").order("name"),
    admin
      .from("survey_forms")
      .select("id, tenant_id, name, description, is_active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
    admin.from("place_company_assignments").select("tenant_id").eq("store_id", id),
    admin.from("place_promoter_assignments").select("user_id").eq("store_id", id),
    admin.from("place_representative_assignments").select("user_id").eq("store_id", id),
    admin.from("place_tag_assignments").select("tag_id").eq("store_id", id),
    admin.from("place_form_assignments").select("form_id").eq("store_id", id)
  ]);

  if (!store) {
    notFound();
  }

  const typedStore = store as StoreRow;
  const allowedRoles = new Set<Role>(["admin", "manager"]);
  const representativeIds = new Set(
    ((roles as RoleRow[] | null) || [])
      .filter((role) => allowedRoles.has(role.role_id as Role))
      .map((role) => role.user_id)
  );
  const promoterRoleIds = new Set(
    ((roles as RoleRow[] | null) || [])
      .filter((role) => role.role_id === "promoter")
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
  const assignedCompanyId =
    ((companyAssignments || []) as { tenant_id: string }[])[0]?.tenant_id || store.tenant_id;
  const tagNameById = new Map(
    ((tags || []) as { id: string; name: string }[]).map((tag) => [tag.id, tag.name])
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Edit place</h1>
      </header>

      <PlaceForm
        action={updatePlaceFromPage}
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
        initialValue={{
          id: typedStore.id,
          name: typedStore.name,
          externalCode: typedStore.external_code,
          isActive: typedStore.is_active,
          address: typedStore.address,
          city: typedStore.city,
          state: typedStore.state,
          postalCode: typedStore.postal_code,
          countryCode: typedStore.country_code,
          country: typedStore.country,
          contactName: typedStore.contact_name,
          contactTitle: typedStore.contact_title,
          contactEmail: typedStore.contact_email,
          website: typedStore.website,
          phone: typedStore.phone,
          cellPhone: typedStore.cell_phone,
          note: typedStore.note,
          latitude: typedStore.latitude,
          longitude: typedStore.longitude,
          allowedRadiusMeters: typedStore.allowed_radius_meters ?? typedStore.geofence_radius_meters,
          companyId: assignedCompanyId,
          promoterIds: ((promoterAssignments || []) as { user_id: string }[]).map(
            (assignment) => assignment.user_id
          ),
          representativeIds: ((representativeAssignments || []) as { user_id: string }[]).map(
            (assignment) => assignment.user_id
          ),
          surveyFormIds: ((formAssignments || []) as { form_id: string }[]).map((assignment) => assignment.form_id),
          tagNames: ((tagAssignments || []) as { tag_id: string }[])
            .map((assignment) => tagNameById.get(assignment.tag_id))
            .filter(Boolean) as string[]
        }}
        promoters={promoters}
        representatives={representatives}
        submitLabel="Save"
        tags={((tags || []) as { id: string; name: string }[])}
      />
    </main>
  );
}
