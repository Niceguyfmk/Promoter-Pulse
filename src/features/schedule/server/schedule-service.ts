import "server-only";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import type { Database } from "@/shared/supabase/database.types";

type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];
type VisitReportRow = Database["public"]["Tables"]["visit_reports"]["Row"];

type RelatedStore = {
  name: string | null;
  address: string | null;
};

type RelatedUser = {
  full_name: string | null;
  email: string | null;
};

type ScheduleShiftRow = ShiftRow & {
  retail_stores?: RelatedStore | null;
};

type ScheduleVisitRow = VisitReportRow & {
  retail_stores?: RelatedStore | null;
};

export type ScheduleEventStatus = "upcoming" | "done" | "missed" | "unplanned";

export type ScheduleEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: ScheduleEventStatus;
  storeName: string;
  promoterName: string;
  source: "shift" | "checkin";
};

export type ScheduleCalendarData = {
  events: ScheduleEvent[];
  rangeEnd: string;
  rangeStart: string;
  viewerScope: "admin" | "manager" | "promoter";
};

export class ScheduleService {
  constructor(private readonly authService = createAuthService()) {}

  async getCalendarEvents(rangeStart: Date, rangeEnd: Date): Promise<ScheduleCalendarData> {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");
    const viewerScope = isAdmin ? "admin" : isManager ? "manager" : "promoter";
    const supabase = isAdmin || isManager ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const start = rangeStart.toISOString();
    const end = rangeEnd.toISOString();

    let shiftsQuery = supabase
      .from("shifts")
      .select(
        `
        *,
        retail_stores(name, address)
      `
      )
      .is("deleted_at", null)
      .gte("scheduled_start_at", start)
      .lt("scheduled_start_at", end)
      .order("scheduled_start_at", { ascending: true });

    let visitsQuery = supabase
      .from("visit_reports")
      .select(
        `
        *,
        retail_stores!visit_reports_store_id_fkey(name, address)
      `
      )
      .is("deleted_at", null)
      .gte("started_at", start)
      .lt("started_at", end)
      .order("started_at", { ascending: true });

    if (isManager || !isAdmin) {
      shiftsQuery = shiftsQuery.eq("tenant_id", session.user.tenantId);
      visitsQuery = visitsQuery.eq("tenant_id", session.user.tenantId);
    }

    if (!isAdmin && !isManager) {
      shiftsQuery = shiftsQuery.eq("promoter_user_id", session.user.id);
      visitsQuery = visitsQuery.eq("promoter_user_id", session.user.id);
    }

    const [{ data: shifts, error: shiftsError }, { data: visits, error: visitsError }] = await Promise.all([
      shiftsQuery,
      visitsQuery
    ]);

    const error = shiftsError || visitsError;
    if (error) {
      console.error("[ScheduleService] Failed to fetch calendar events:", serializeSupabaseError(error));
      throw new AppError("INTERNAL_ERROR", "Failed to fetch schedule events", error);
    }

    const shiftRows = (shifts ?? []) as unknown as ScheduleShiftRow[];
    const visitRows = (visits ?? []) as unknown as ScheduleVisitRow[];
    const unplannedVisits = visitRows.filter((visit) => !hasMatchingShift(visit, shiftRows));
    const promoterNames = await this.getPromoterNames({
      isAdmin,
      isManager,
      promoterIds: [
        ...new Set([
          ...shiftRows.map((shift) => shift.promoter_user_id),
          ...unplannedVisits.map((visit) => visit.promoter_user_id)
        ])
      ],
      sessionPromoterName: session.user.fullName || session.user.email,
      sessionUserId: session.user.id
    });

    return {
      events: [
        ...shiftRows.map((shift) => mapShiftToEvent(shift, promoterNames)),
        ...unplannedVisits.map((visit) => mapVisitToEvent(visit, promoterNames))
      ].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
      rangeEnd: end,
      rangeStart: start,
      viewerScope
    };
  }

  private async getPromoterNames({
    isAdmin,
    isManager,
    promoterIds,
    sessionPromoterName,
    sessionUserId
  }: {
    isAdmin: boolean;
    isManager: boolean;
    promoterIds: string[];
    sessionPromoterName: string;
    sessionUserId: string;
  }) {
    const names = new Map<string, string>();

    if (!isAdmin && !isManager) {
      names.set(sessionUserId, sessionPromoterName);
      return names;
    }

    if (promoterIds.length === 0) {
      return names;
    }

    const { data, error } = await createSupabaseAdminClient()
      .from("users")
      .select("id, full_name, email")
      .in("id", promoterIds);

    if (error) {
      console.error("[ScheduleService] Failed to fetch promoter names:", serializeSupabaseError(error));
      return names;
    }

    for (const user of (data ?? []) as Array<RelatedUser & { id: string }>) {
      names.set(user.id, displayUser(user));
    }

    return names;
  }
}

export function createScheduleService() {
  return new ScheduleService();
}

function mapShiftToEvent(shift: ScheduleShiftRow, promoterNames: Map<string, string>): ScheduleEvent {
  return {
    id: shift.id,
    title: "Shift",
    startsAt: shift.scheduled_start_at,
    endsAt: shift.scheduled_end_at,
    status: resolveShiftStatus(shift),
    storeName: shift.retail_stores?.name || "Unknown store",
    promoterName: promoterNames.get(shift.promoter_user_id) || "Promoter",
    source: "shift"
  };
}

function mapVisitToEvent(visit: ScheduleVisitRow, promoterNames: Map<string, string>): ScheduleEvent {
  return {
    id: visit.id,
    title: visit.form_name || "Check-in",
    startsAt: visit.started_at,
    endsAt: visit.checked_out_at,
    status: "unplanned",
    storeName: visit.retail_stores?.name || "Unknown store",
    promoterName: promoterNames.get(visit.promoter_user_id) || "Promoter",
    source: "checkin"
  };
}

function resolveShiftStatus(shift: ScheduleShiftRow): ScheduleEventStatus {
  if (shift.status === "checked_out") {
    return "done";
  }

  if (shift.status === "missed" || new Date(shift.scheduled_end_at).getTime() < Date.now()) {
    return "missed";
  }

  return "upcoming";
}

function hasMatchingShift(visit: ScheduleVisitRow, shifts: ScheduleShiftRow[]) {
  const visitStartedAt = new Date(visit.started_at).getTime();

  return shifts.some((shift) => {
    if (shift.promoter_user_id !== visit.promoter_user_id || shift.store_id !== visit.store_id) {
      return false;
    }

    const shiftStart = new Date(shift.scheduled_start_at).getTime();
    const shiftEnd = new Date(shift.scheduled_end_at).getTime();

    return visitStartedAt >= shiftStart && visitStartedAt <= shiftEnd;
  });
}

function displayUser(user: RelatedUser | null | undefined) {
  return user?.full_name || user?.email || "Promoter";
}

function serializeSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return error;
  }

  return {
    code: "code" in error ? error.code : undefined,
    details: "details" in error ? error.details : undefined,
    hint: "hint" in error ? error.hint : undefined,
    message: "message" in error ? error.message : undefined
  };
}
