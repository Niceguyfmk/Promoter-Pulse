"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppError } from "@/core/errors/app-error";
import { createFormsService } from "./forms-service";
import { createSupabaseAdminClient } from "@/shared/supabase/server";
import { parseSurveySchemaText } from "../lib/survey-schema";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createSurveyFormAction(formData: FormData) {
  const session = await createFormsService().requireManagerSession();
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const schemaText = text(formData, "schemaJson");

  if (!name) {
    throw new AppError("VALIDATION_ERROR", "Form name is required");
  }

  const schema = parseSurveySchemaText(schemaText);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("survey_forms")
    .insert({
      tenant_id: session.user.tenantId,
      name,
      description,
      schema_json: schema,
      is_active: formData.get("isActive") === "true",
      created_by_user_id: session.user.id,
      updated_by_user_id: session.user.id
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new AppError("INTERNAL_ERROR", "Failed to create form", error);
  }

  revalidatePath("/reports");
  revalidatePath("/templates/forms");
  revalidatePath("/places/new");
  redirect(`/templates/forms/${data.id}` as Route);
}

export async function updateSurveyFormAction(formData: FormData) {
  const session = await createFormsService().requireManagerSession();
  const formId = text(formData, "formId");
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const schemaText = text(formData, "schemaJson");

  if (!formId || !name) {
    throw new AppError("VALIDATION_ERROR", "Form id and name are required");
  }

  const schema = parseSurveySchemaText(schemaText);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("survey_forms")
    .update({
      name,
      description,
      schema_json: schema,
      is_active: formData.get("isActive") === "true",
      updated_by_user_id: session.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", formId)
    .eq("tenant_id", session.user.tenantId)
    .is("deleted_at", null);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Failed to update form", error);
  }

  revalidatePath("/reports");
  revalidatePath("/templates/forms");
  revalidatePath(`/templates/forms/${formId}`);
  revalidatePath("/places/new");
  redirect(`/templates/forms/${formId}` as Route);
}

export async function deleteSurveyFormAction(formData: FormData) {
  const session = await createFormsService().requireManagerSession();
  const formId = text(formData, "formId");

  if (!formId) {
    throw new AppError("VALIDATION_ERROR", "Form id is required");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("survey_forms")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_by_user_id: session.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", formId)
    .eq("tenant_id", session.user.tenantId)
    .is("deleted_at", null);

  if (error) {
    throw new AppError("INTERNAL_ERROR", "Failed to delete form", error);
  }

  revalidatePath("/reports");
  revalidatePath("/templates/forms");
  revalidatePath("/places/new");
  redirect("/templates/forms" as Route);
}
