import "server-only";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import type { Database } from "@/shared/supabase/database.types";

export type SurveyFormRow = Database["public"]["Tables"]["survey_forms"]["Row"];
type PlaceFormAssignmentRow = Database["public"]["Tables"]["place_form_assignments"]["Row"];

export type ManagedSurveyForm = SurveyFormRow & {
  assignmentCount: number;
};

export type AssignedSurveyForm = Pick<SurveyFormRow, "id" | "name" | "description" | "schema_json">;

export class FormsService {
  constructor(private readonly authService = createAuthService()) {}

  async requireManagerSession() {
    const session = await this.authService.requireSession();

    if (!session.roles.some((role) => role === "admin" || role === "manager")) {
      throw new AppError("FORBIDDEN", "Only admins and managers can manage forms");
    }

    return session;
  }

  async listManagedForms(): Promise<ManagedSurveyForm[]> {
    const session = await this.requireManagerSession();
    const admin = createSupabaseAdminClient();
    const { data: forms, error } = await admin
      .from("survey_forms")
      .select("*")
      .eq("tenant_id", session.user.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new AppError("INTERNAL_ERROR", "Failed to load forms", error);
    }

    const formIds = (forms ?? []).map((form) => form.id);
    if (formIds.length === 0) {
      return [];
    }

    const { data: assignments, error: assignmentsError } = await admin
      .from("place_form_assignments")
      .select("store_id, form_id")
      .in("form_id", formIds);

    if (assignmentsError) {
      throw new AppError("INTERNAL_ERROR", "Failed to load form assignments", assignmentsError);
    }

    const counts = new Map<string, number>();
    for (const assignment of (assignments ?? []) as PlaceFormAssignmentRow[]) {
      counts.set(assignment.form_id, (counts.get(assignment.form_id) ?? 0) + 1);
    }

    return ((forms ?? []) as SurveyFormRow[]).map((form) => ({
      ...form,
      assignmentCount: counts.get(form.id) ?? 0
    }));
  }

  async getManagedForm(formId: string): Promise<SurveyFormRow | null> {
    const session = await this.requireManagerSession();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("survey_forms")
      .select("*")
      .eq("id", formId)
      .eq("tenant_id", session.user.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new AppError("INTERNAL_ERROR", "Failed to load form", error);
    }

    return data as SurveyFormRow | null;
  }

  async listFormsForTenant(tenantId?: string) {
    const session = await this.requireManagerSession();
    const targetTenantId = tenantId ?? session.user.tenantId;

    if (!session.roles.includes("admin") && targetTenantId !== session.user.tenantId) {
      throw new AppError("FORBIDDEN", "Managers can only access forms for their own tenant");
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("survey_forms")
      .select("id, name, description, schema_json, is_active")
      .eq("tenant_id", targetTenantId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name");

    if (error) {
      throw new AppError("INTERNAL_ERROR", "Failed to load tenant forms", error);
    }

    return (data ?? []) as Pick<SurveyFormRow, "id" | "name" | "description" | "schema_json" | "is_active">[];
  }

  async listAssignedFormsForStore(storeId: string): Promise<AssignedSurveyForm[]> {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();

    const { data: store, error: storeError } = await supabase
      .from("retail_stores")
      .select("id, tenant_id")
      .eq("id", storeId)
      .eq("tenant_id", session.user.tenantId)
      .maybeSingle();

    if (storeError || !store) {
      throw new AppError("NOT_FOUND", "Place not found");
    }

    const admin = createSupabaseAdminClient();
    const { data: assignments, error: assignmentsError } = await admin
      .from("place_form_assignments")
      .select("form_id")
      .eq("store_id", storeId);

    if (assignmentsError) {
      throw new AppError("INTERNAL_ERROR", "Failed to load place forms", assignmentsError);
    }

    const formIds = ((assignments ?? []) as Array<{ form_id: string }>).map((assignment) => assignment.form_id);
    if (formIds.length === 0) {
      return [];
    }

    const { data: forms, error } = await admin
      .from("survey_forms")
      .select("id, name, description, schema_json")
      .eq("tenant_id", session.user.tenantId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("id", formIds)
      .order("name");

    if (error) {
      throw new AppError("INTERNAL_ERROR", "Failed to load assigned forms", error);
    }

    return (forms ?? []) as AssignedSurveyForm[];
  }
}

export function createFormsService() {
  return new FormsService();
}
