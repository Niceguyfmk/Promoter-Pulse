"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient } from "@/shared/supabase/server";

async function requirePlaceManager() {
  const session = await createAuthService().requireSession();

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    throw new AppError("FORBIDDEN", "Only admins and managers can manage places");
  }

  return session;
}

function getAll(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

function nullableString(formData: FormData, key: string) {
  const value = (formData.get(key) as string | null)?.trim();
  return value || null;
}

function nullableNumber(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function integerWithDefault(formData: FormData, key: string, defaultValue: number) {
  const value = nullableString(formData, key);
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function getPlaceGpsFields(formData: FormData) {
  const latitude = nullableNumber(formData, "latitude");
  const longitude = nullableNumber(formData, "longitude");
  const allowedRadiusMeters = integerWithDefault(formData, "allowedRadiusMeters", 100);

  if (Number.isNaN(latitude) || (latitude != null && (latitude < -90 || latitude > 90))) {
    return { ok: false as const, error: "Latitude must be between -90 and 90." };
  }

  if (Number.isNaN(longitude) || (longitude != null && (longitude < -180 || longitude > 180))) {
    return { ok: false as const, error: "Longitude must be between -180 and 180." };
  }

  if (Number.isNaN(allowedRadiusMeters) || allowedRadiusMeters <= 0) {
    return { ok: false as const, error: "Allowed radius must be a positive whole number." };
  }

  return {
    ok: true as const,
    fields: {
      latitude,
      longitude,
      allowed_radius_meters: allowedRadiusMeters,
      geofence_radius_meters: allowedRadiusMeters
    }
  };
}

async function syncPlaceRelations({
  companyId,
  promoterIds,
  representativeIds,
  storeId,
  tagNames
}: {
  companyId: string;
  promoterIds: string[];
  representativeIds: string[];
  storeId: string;
  tagNames: string[];
}) {
  const admin = createSupabaseAdminClient();

  await Promise.all([
    admin.from("place_company_assignments").delete().eq("store_id", storeId),
    admin.from("place_representative_assignments").delete().eq("store_id", storeId),
    admin.from("place_promoter_assignments").delete().eq("store_id", storeId),
    admin.from("place_tag_assignments").delete().eq("store_id", storeId)
  ]);

  if (companyId) {
    const { error } = await admin.from("place_company_assignments").insert(
      [{
        store_id: storeId,
        tenant_id: companyId
      }]
    );

    if (error) {
      throw new AppError("INTERNAL_ERROR", `Failed to assign companies: ${error.message}`, error);
    }
  }

  if (representativeIds.length) {
    const { error } = await admin.from("place_representative_assignments").insert(
      representativeIds.map((userId) => ({
        store_id: storeId,
        user_id: userId
      }))
    );

    if (error) {
      throw new AppError("INTERNAL_ERROR", `Failed to assign representatives: ${error.message}`, error);
    }
  }

  if (promoterIds.length) {
    const { error } = await admin.from("place_promoter_assignments").insert(
      promoterIds.map((userId) => ({
        store_id: storeId,
        user_id: userId
      }))
    );

    if (error) {
      throw new AppError("INTERNAL_ERROR", `Failed to assign promoters: ${error.message}`, error);
    }
  }

  const normalizedTags = Array.from(
    new Set(tagNames.map((name) => name.trim()).filter(Boolean))
  );

  if (normalizedTags.length) {
    const { error: upsertError } = await admin
      .from("place_tags")
      .upsert(normalizedTags.map((name) => ({ name })), { onConflict: "name" });

    if (upsertError) {
      throw new AppError("INTERNAL_ERROR", `Failed to save tags: ${upsertError.message}`, upsertError);
    }

    const { data: tags, error: tagsError } = await admin
      .from("place_tags")
      .select("id, name")
      .in("name", normalizedTags);

    if (tagsError) {
      throw new AppError("INTERNAL_ERROR", `Failed to load tags: ${tagsError.message}`, tagsError);
    }

    if (tags?.length) {
      const { error: assignError } = await admin.from("place_tag_assignments").insert(
        tags.map((tag) => ({
          store_id: storeId,
          tag_id: tag.id
        }))
      );

      if (assignError) {
        throw new AppError("INTERNAL_ERROR", `Failed to assign tags: ${assignError.message}`, assignError);
      }
    }
  }
}

export async function createPlace(formData: FormData) {
  const session = await requirePlaceManager();
  const admin = createSupabaseAdminClient();
  const companyId = (formData.get("companyId") as string | null)?.trim();
  const promoterIds = getAll(formData, "promoterIds");
  const representativeIds = getAll(formData, "representativeIds");
  const tagNames = getAll(formData, "tagNames");
  const name = nullableString(formData, "name");

  if (!name) {
    return { error: "Place name is required." };
  }

  if (!companyId) {
    return { error: "Assign a company." };
  }

  if (session.roles.includes("manager") && companyId !== session.user.tenantId) {
    return { error: "Managers can only assign places to their own company." };
  }

  const gpsFields = getPlaceGpsFields(formData);
  if (!gpsFields.ok) {
    return { error: gpsFields.error };
  }

  const { data: store, error } = await admin
    .from("retail_stores")
    .insert({
      tenant_id: companyId,
      name,
      external_code: `place-${crypto.randomUUID().slice(0, 8)}`,
      is_active: formData.get("isActive") === "true",
      address: nullableString(formData, "address"),
      city: nullableString(formData, "city"),
      state: nullableString(formData, "state"),
      postal_code: nullableString(formData, "postalCode"),
      country_code: nullableString(formData, "countryCode"),
      country: nullableString(formData, "country"),
      contact_name: nullableString(formData, "contactName"),
      contact_title: nullableString(formData, "contactTitle"),
      contact_email: nullableString(formData, "contactEmail"),
      website: nullableString(formData, "website"),
      phone: nullableString(formData, "phone"),
      cell_phone: nullableString(formData, "cellPhone"),
      note: nullableString(formData, "note"),
      ...gpsFields.fields
    })
    .select("id")
    .single();

  if (error || !store) {
    return { error: error?.message || "Failed to create place." };
  }

  try {
    await syncPlaceRelations({ companyId, promoterIds, representativeIds, storeId: store.id, tagNames });
  } catch (error) {
    await admin.from("retail_stores").delete().eq("id", store.id);
    return { error: error instanceof Error ? error.message : "Failed to save place relations." };
  }

  revalidatePath("/places");
  redirect("/places");
}

export async function updatePlace(formData: FormData) {
  const session = await requirePlaceManager();
  const admin = createSupabaseAdminClient();
  const storeId = formData.get("storeId") as string;
  const companyId = (formData.get("companyId") as string | null)?.trim();
  const promoterIds = getAll(formData, "promoterIds");
  const representativeIds = getAll(formData, "representativeIds");
  const tagNames = getAll(formData, "tagNames");
  const name = nullableString(formData, "name");

  if (!storeId || !name) {
    return { error: "Place id and name are required." };
  }

  if (!companyId) {
    return { error: "Assign a company." };
  }

  if (session.roles.includes("manager") && companyId !== session.user.tenantId) {
    return { error: "Managers can only assign places to their own company." };
  }

  const gpsFields = getPlaceGpsFields(formData);
  if (!gpsFields.ok) {
    return { error: gpsFields.error };
  }

  const { error } = await admin
    .from("retail_stores")
    .update({
      tenant_id: companyId,
      name,
      is_active: formData.get("isActive") === "true",
      address: nullableString(formData, "address"),
      city: nullableString(formData, "city"),
      state: nullableString(formData, "state"),
      postal_code: nullableString(formData, "postalCode"),
      country_code: nullableString(formData, "countryCode"),
      country: nullableString(formData, "country"),
      contact_name: nullableString(formData, "contactName"),
      contact_title: nullableString(formData, "contactTitle"),
      contact_email: nullableString(formData, "contactEmail"),
      website: nullableString(formData, "website"),
      phone: nullableString(formData, "phone"),
      cell_phone: nullableString(formData, "cellPhone"),
      note: nullableString(formData, "note"),
      ...gpsFields.fields,
      updated_at: new Date().toISOString()
    })
    .eq("id", storeId);

  if (error) {
    return { error: error.message };
  }

  try {
    await syncPlaceRelations({ companyId, promoterIds, representativeIds, storeId, tagNames });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save place relations." };
  }

  revalidatePath("/places");
  redirect("/places");
}

export async function updatePlaceActiveStatus(formData: FormData) {
  await requirePlaceManager();
  const admin = createSupabaseAdminClient();
  const storeId = formData.get("storeId") as string;
  const isActive = formData.get("isActive") === "true";

  if (!storeId) {
    return { error: "Place id is required." };
  }

  const { error } = await admin
    .from("retail_stores")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", storeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/places");
  return { success: true };
}
