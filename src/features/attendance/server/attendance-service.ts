import "server-only";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import type { Database } from "@/shared/supabase/database.types";
import type { CheckInRequest, CheckOutRequest } from "../schemas/attendance-schemas";

type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];
type RetailStoreRow = Database["public"]["Tables"]["retail_stores"]["Row"];

export type AttendanceShift = ShiftRow & {
  retail_stores?: Pick<RetailStoreRow, "name" | "address"> | null;
};

export type TodayActivitySummary = {
  activeReps: number;
  visits: number;
  completed: number;
};

export type ActivitySummaryPeriod = "day" | "week" | "month";

export type ActiveCheckedInShift = Pick<
  AttendanceShift,
  "id" | "checked_in_at" | "retail_stores" | "scheduled_start_at" | "store_id"
>;

export type ActiveWorkflowVisit = {
  id: string;
  store_id: string;
  started_at: string;
  retail_stores?: Pick<RetailStoreRow, "name" | "address"> | null;
};

export type CoverageStore = Pick<
  RetailStoreRow,
  "id" | "name" | "address" | "latitude" | "longitude"
> & {
  isLive: boolean;
};

export class AttendanceService {
  constructor(private readonly authService = createAuthService()) {}

  async getTodayActivitySummary(period: ActivitySummaryPeriod = "day"): Promise<TodayActivitySummary> {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");
    const supabase = isAdmin || isManager ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const { start, end } = getActivityRange(period);

    let visitsQuery = supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("scheduled_start_at", start)
      .lt("scheduled_start_at", end);
    let activeQuery = supabase
      .from("shifts")
      .select("promoter_user_id")
      .is("deleted_at", null)
      .gte("scheduled_start_at", start)
      .lt("scheduled_start_at", end)
      .eq("status", "checked_in");
    let completedQuery = supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("scheduled_start_at", start)
      .lt("scheduled_start_at", end)
      .eq("status", "checked_out");
    let activeReportsQuery = supabase
      .from("visit_reports")
      .select("promoter_user_id")
      .eq("status", "draft")
      .is("deleted_at", null);
    let completedReportsQuery = supabase
      .from("visit_reports")
      .select("id", { count: "exact", head: true })
      .neq("status", "draft")
      .is("deleted_at", null)
      .gte("checked_out_at", start)
      .lt("checked_out_at", end);

    if (isManager || !isAdmin) {
      visitsQuery = visitsQuery.eq("tenant_id", session.user.tenantId);
      activeQuery = activeQuery.eq("tenant_id", session.user.tenantId);
      completedQuery = completedQuery.eq("tenant_id", session.user.tenantId);
      activeReportsQuery = activeReportsQuery.eq("tenant_id", session.user.tenantId);
      completedReportsQuery = completedReportsQuery.eq("tenant_id", session.user.tenantId);
    }

    if (!isAdmin && !isManager) {
      visitsQuery = visitsQuery.eq("promoter_user_id", session.user.id);
      activeQuery = activeQuery.eq("promoter_user_id", session.user.id);
      completedQuery = completedQuery.eq("promoter_user_id", session.user.id);
      activeReportsQuery = activeReportsQuery.eq("promoter_user_id", session.user.id);
      completedReportsQuery = completedReportsQuery.eq("promoter_user_id", session.user.id);
    }

    const [
      { count: visits, error: visitsError },
      { data: activeRows, error: activeError },
      { count: completed, error: completedError },
      { data: activeReportRows, error: activeReportsError },
      { count: completedReports, error: completedReportsError }
    ] = await Promise.all([
      visitsQuery,
      activeQuery,
      completedQuery,
      activeReportsQuery,
      completedReportsQuery
    ]);

    const error = visitsError || activeError || completedError || activeReportsError || completedReportsError;
    if (error) {
      console.error("[AttendanceService] Failed to fetch today activity summary:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to fetch today activity summary", error);
    }

    const activePromoterIds = new Set([
      ...(activeRows?.map((shift) => shift.promoter_user_id) ?? []),
      ...(activeReportRows?.map((report) => report.promoter_user_id) ?? [])
    ]);

    return {
      activeReps: activePromoterIds.size,
      visits: visits ?? 0,
      completed: (completed ?? 0) + (completedReports ?? 0)
    };
  }

  async getUpcomingShifts() {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");
    const supabase = isAdmin || isManager ? createSupabaseAdminClient() : await createSupabaseServerClient();

    let query = supabase
      .from("shifts")
      .select(`
        *,
        retail_stores(*)
      `)
      .order("scheduled_start_at", { ascending: true })
      .limit(5);

    if (isManager) {
      query = query.eq("tenant_id", session.user.tenantId);
    } else if (!isAdmin) {
      query = query
        .eq("tenant_id", session.user.tenantId)
        .eq("promoter_user_id", session.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AttendanceService] Failed to fetch shifts:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to fetch shifts", error);
    }

    return (data ?? []) as unknown as AttendanceShift[];
  }

  async getActiveCheckedInShift(): Promise<ActiveCheckedInShift | null> {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shifts")
      .select(`
        id,
        store_id,
        checked_in_at,
        scheduled_start_at,
        retail_stores(name, address)
      `)
      .eq("tenant_id", session.user.tenantId)
      .eq("promoter_user_id", session.user.id)
      .eq("status", "checked_in")
      .is("deleted_at", null)
      .order("checked_in_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[AttendanceService] Failed to fetch active checked-in shift:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to fetch active shift", error);
    }

    return data as unknown as ActiveCheckedInShift | null;
  }

  async getActiveWorkflowVisit(): Promise<ActiveWorkflowVisit | null> {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("visit_reports")
      .select(`
        id,
        store_id,
        started_at,
        retail_stores!visit_reports_store_id_fkey(name, address)
      `)
      .eq("tenant_id", session.user.tenantId)
      .eq("promoter_user_id", session.user.id)
      .eq("status", "draft")
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[AttendanceService] Failed to fetch active workflow visit:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to fetch active workflow", error);
    }

    return data as unknown as ActiveWorkflowVisit | null;
  }

  async getStores() {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");

    if (isAdmin || isManager) {
      const supabase = createSupabaseAdminClient();
      let query = supabase.from("retail_stores").select("*");

      if (isManager) {
        query = query.eq("tenant_id", session.user.tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[AttendanceService] Store fetch failed (Admin):", error);
        return [];
      }
      return (data ?? []) as unknown as RetailStoreRow[];
    }

    // Promoters see assigned places directly, plus places from their shifts.
    const supabase = await createSupabaseServerClient();
    const [{ data: shifts, error: shiftsError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        supabase
          .from("shifts")
          .select(`
            store_id,
            retail_stores(*)
          `)
          .eq("promoter_user_id", session.user.id)
          .eq("tenant_id", session.user.tenantId),
        supabase
          .from("place_promoter_assignments")
          .select(`
            store_id,
            retail_stores(*)
          `)
          .eq("user_id", session.user.id)
      ]);

    if (shiftsError || assignmentsError) {
      console.error("[AttendanceService] Assigned store fetch failed:", shiftsError || assignmentsError);
      return [];
    }

    const storeMap = new Map<string, RetailStoreRow>();
    shifts?.forEach((shift) => {
      if (shift.retail_stores && !storeMap.has(shift.store_id)) {
        storeMap.set(shift.store_id, shift.retail_stores as unknown as RetailStoreRow);
      }
    });
    assignments?.forEach((assignment) => {
      if (assignment.retail_stores && !storeMap.has(assignment.store_id)) {
        storeMap.set(assignment.store_id, assignment.retail_stores as unknown as RetailStoreRow);
      }
    });

    return Array.from(storeMap.values());
  }

  async getCoverageStores(): Promise<CoverageStore[]> {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");
    const supabase = isAdmin || isManager ? createSupabaseAdminClient() : await createSupabaseServerClient();

    let storesQuery = supabase
      .from("retail_stores")
      .select("id, name, address, latitude, longitude")
      .eq("is_active", true)
      .is("deleted_at", null)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    let activeShiftsQuery = supabase
      .from("shifts")
      .select("store_id")
      .eq("status", "checked_in")
      .is("deleted_at", null);

    let activeReportsQuery = supabase
      .from("visit_reports")
      .select("store_id")
      .eq("status", "draft")
      .is("deleted_at", null);

    if (isManager || !isAdmin) {
      storesQuery = storesQuery.eq("tenant_id", session.user.tenantId);
      activeShiftsQuery = activeShiftsQuery.eq("tenant_id", session.user.tenantId);
      activeReportsQuery = activeReportsQuery.eq("tenant_id", session.user.tenantId);
    }

    if (!isAdmin && !isManager) {
      activeShiftsQuery = activeShiftsQuery.eq("promoter_user_id", session.user.id);
      activeReportsQuery = activeReportsQuery.eq("promoter_user_id", session.user.id);
    }

    const [
      { data: stores, error: storesError },
      { data: activeShifts, error: activeShiftsError },
      { data: activeReports, error: activeReportsError }
    ] = await Promise.all([storesQuery, activeShiftsQuery, activeReportsQuery]);

    const error = storesError || activeShiftsError || activeReportsError;
    if (error) {
      console.error("[AttendanceService] Failed to fetch coverage stores:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to fetch coverage overview", error);
    }

    const liveStoreIds = new Set([
      ...(activeShifts?.map((shift) => shift.store_id) ?? []),
      ...(activeReports?.map((report) => report.store_id) ?? [])
    ]);

    return ((stores ?? []) as Pick<
      RetailStoreRow,
      "id" | "name" | "address" | "latitude" | "longitude"
    >[]).map((store) => ({
      ...store,
      isLive: liveStoreIds.has(store.id)
    }));
  }

  async checkIn(request: CheckInRequest) {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();

    // 1. Fetch and validate shift
    const { data: shift, error: fetchError } = await supabase
      .from("shifts")
      .select("*, store:retail_stores(*)")
      .eq("id", request.shiftId)
      .eq("promoter_user_id", session.user.id)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (fetchError || !shift) {
      throw new AppError("NOT_FOUND", "Shift not found or unauthorized");
    }

    if (shift.status !== "scheduled") {
      throw new AppError("INVALID_STATE", `Cannot check in. Current status: ${shift.status}`);
    }

    // 2. Geofence validation (simple version for now)
    // In a real app, we'd check if request.latitude/longitude is within shift.store.geofence_radius_meters

    // 3. Update shift
    const { error: updateError } = await supabase
      .from("shifts")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
        check_in_latitude: request.latitude,
        check_in_longitude: request.longitude,
        updated_at: new Date().toISOString()
      })
      .eq("id", shift.id);

    if (updateError) {
      throw new AppError("INTERNAL_ERROR", "Failed to check in", updateError);
    }

    // 4. Audit Log (concept)
    console.log(`[Audit] User ${session.user.id} checked in to shift ${shift.id}`);

    return { success: true };
  }

  async checkOut(request: CheckOutRequest) {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();

    // 1. Fetch and validate shift
    const { data: shift, error: fetchError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", request.shiftId)
      .eq("promoter_user_id", session.user.id)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (fetchError || !shift) {
      throw new AppError("NOT_FOUND", "Shift not found or unauthorized");
    }

    if (shift.status !== "checked_in") {
      throw new AppError("INVALID_STATE", `Cannot check out. Current status: ${shift.status}`);
    }

    // 2. Update shift
    const { error: updateError } = await supabase
      .from("shifts")
      .update({
        status: "checked_out",
        checked_out_at: new Date().toISOString(),
        check_out_latitude: request.latitude,
        check_out_longitude: request.longitude,
        updated_at: new Date().toISOString()
      })
      .eq("id", shift.id);

    if (updateError) {
      throw new AppError("INTERNAL_ERROR", "Failed to check out", updateError);
    }

    console.log(`[Audit] User ${session.user.id} checked out from shift ${shift.id}`);

    return { success: true };
  }
}

export function createAttendanceService() {
  return new AttendanceService();
}

function getActivityRange(period: ActivitySummaryPeriod) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = startDate.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    startDate.setDate(startDate.getDate() - daysSinceMonday);
  }

  if (period === "month") {
    startDate.setDate(1);
  }

  const endDate = new Date(startDate);
  if (period === "day") {
    endDate.setDate(endDate.getDate() + 1);
  } else if (period === "week") {
    endDate.setDate(endDate.getDate() + 7);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}
