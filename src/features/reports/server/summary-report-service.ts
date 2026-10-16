import "server-only";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import type { Database, Json } from "@/shared/supabase/database.types";

type VisitReportRow = Database["public"]["Tables"]["visit_reports"]["Row"];
type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];

export type SummaryReportPeriod = "day" | "week" | "month" | "year";

export type SummaryReportMetric = {
  label: string;
  value: number;
};

export type SummaryReportTrendPoint = {
  label: string;
  reps: number;
  clientVisits: number;
  activities: number;
};

export type SummaryReportData = {
  organizationName: string;
  period: SummaryReportPeriod;
  periodLabel: string;
  generatedAt: string;
  hero: {
    reps: number;
    avgActiveRepsPerDay: number;
    clientVisits: number;
    avgClientVisitsPerDay: number;
    activities: number;
    avgActivitiesPerDay: number;
  };
  efficiency: {
    daysActive: number;
    workingMinutes: number;
    totalMileage: number;
    visitedClients: number;
  };
  activitiesByType: ActivityCounts;
  formsBreakdown: Array<SummaryReportMetric>;
  salesAndMerchandising: {
    salesDocuments: number;
    totalValue: number;
  };
  visitPlans: {
    totalVisitsDone: number;
    scheduled: number;
    visitedAsScheduled: number;
    unscheduledVisits: number;
    missedSchedule: number;
  };
  checkInStatus: {
    gpsVerified: number;
    remote: number;
    missingStoreGps: number;
  };
  trend: SummaryReportTrendPoint[];
};

type ActivityCounts = {
  forms: number;
  retailAudits: number;
  photos: number;
  clientNotes: number;
  voiceNotes: number;
};

type SummaryRange = {
  end: Date;
  start: Date;
};

export class SummaryReportService {
  constructor(private readonly authService = createAuthService()) {}

  async getSummary(period: SummaryReportPeriod): Promise<SummaryReportData> {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");
    const supabase =
      isAdmin || isManager ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const range = getSummaryRange(period);

    let reportsQuery = supabase
      .from("visit_reports")
      .select("*")
      .is("deleted_at", null)
      .neq("status", "draft")
      .gte("checked_out_at", range.start.toISOString())
      .lt("checked_out_at", range.end.toISOString());

    let shiftsQuery = supabase
      .from("shifts")
      .select("*")
      .is("deleted_at", null)
      .gte("scheduled_start_at", range.start.toISOString())
      .lt("scheduled_start_at", range.end.toISOString());

    const tenantQuery = supabase
      .from("tenants")
      .select("name")
      .eq("id", session.user.tenantId)
      .maybeSingle();

    if (isManager || !isAdmin) {
      reportsQuery = reportsQuery.eq("tenant_id", session.user.tenantId);
      shiftsQuery = shiftsQuery.eq("tenant_id", session.user.tenantId);
    }

    if (!isAdmin && !isManager) {
      reportsQuery = reportsQuery.eq("promoter_user_id", session.user.id);
      shiftsQuery = shiftsQuery.eq("promoter_user_id", session.user.id);
    }

    const [
      { data: reports, error: reportsError },
      { data: shifts, error: shiftsError },
      { data: tenant }
    ] = await Promise.all([reportsQuery, shiftsQuery, tenantQuery]);

    const error = reportsError || shiftsError;
    if (error) {
      console.error("[SummaryReportService] Failed to load summary report:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to load summary report", error);
    }

    const reportRows = (reports ?? []) as VisitReportRow[];
    const storeIds = [...new Set(reportRows.map((report) => report.store_id))];
    const storesWithGps = new Set<string>();

    if (storeIds.length > 0) {
      const { data: stores, error: storesError } = await supabase
        .from("retail_stores")
        .select("id, latitude, longitude")
        .in("id", storeIds);

      if (storesError) {
        console.error("[SummaryReportService] Failed to load store locations:", storesError);
        throw new AppError("INTERNAL_ERROR", "Failed to load summary report", storesError);
      }

      for (const store of stores ?? []) {
        if (store.latitude != null && store.longitude != null) {
          storesWithGps.add(store.id);
        }
      }
    }

    return buildSummaryReport({
      organizationName: tenant?.name || "Company",
      period,
      range,
      reports: reportRows,
      shifts: (shifts ?? []) as ShiftRow[],
      storesWithGps
    });
  }
}

export function createSummaryReportService() {
  return new SummaryReportService();
}

export function normalizeSummaryPeriod(value: string | undefined): SummaryReportPeriod {
  if (value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "day";
}

function buildSummaryReport({
  organizationName,
  period,
  range,
  reports,
  shifts,
  storesWithGps
}: {
  organizationName: string;
  period: SummaryReportPeriod;
  range: SummaryRange;
  reports: VisitReportRow[];
  shifts: ShiftRow[];
  storesWithGps: Set<string>;
}): SummaryReportData {
  const days = getRangeDays(range);
  const uniqueRepIds = new Set(reports.map((report) => report.promoter_user_id));
  const uniqueStoreIds = new Set(reports.map((report) => report.store_id));
  const activeDays = new Set(
    reports.map((report) => dayKey(new Date(report.checked_out_at || report.started_at)))
  );
  const activitiesByType = reports.reduce<ActivityCounts>(
    (totals, report) => {
      const counts = reportActivityCounts(report);
      totals.forms += counts.forms;
      totals.retailAudits += counts.retailAudits;
      totals.photos += counts.photos;
      totals.clientNotes += counts.clientNotes;
      totals.voiceNotes += counts.voiceNotes;
      return totals;
    },
    { forms: 0, retailAudits: 0, photos: 0, clientNotes: 0, voiceNotes: 0 }
  );
  const activities = Object.values(activitiesByType).reduce((total, value) => total + value, 0);
  const workingMinutes = reports.reduce(
    (total, report) => total + reportDurationMinutes(report),
    0
  );
  const totalMileage = reports.reduce(
    (total, report) => total + Number(report.checkin_distance_meters ?? 0) / 1000,
    0
  );
  const formCounts = reports.reduce((counts, report) => {
    const label = report.form_name || "Daily Check-in";
    counts.set(label, (counts.get(label) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const salesDocuments = reports.filter(
    (report) => Object.keys(asRecord(report.sales_numbers)).length > 0
  ).length;
  const totalValue = reports.reduce(
    (total, report) => total + extractCurrencyTotal(report.sales_numbers),
    0
  );
  const scheduledMatches = matchScheduledVisits(reports, shifts);
  const missedSchedule = shifts.filter((shift) => {
    const ended = new Date(shift.scheduled_end_at).getTime() < Date.now();
    return shift.status === "missed" || (shift.status === "scheduled" && ended);
  }).length;

  return {
    organizationName,
    period,
    periodLabel: formatPeriodLabel(period, range),
    generatedAt: new Date().toISOString(),
    hero: {
      reps: uniqueRepIds.size,
      avgActiveRepsPerDay: averageByDay(reports, days, (report) => report.promoter_user_id),
      clientVisits: reports.length,
      avgClientVisitsPerDay: reports.length / Math.max(days.length, 1),
      activities,
      avgActivitiesPerDay: activities / Math.max(days.length, 1)
    },
    efficiency: {
      daysActive: activeDays.size,
      workingMinutes,
      totalMileage,
      visitedClients: uniqueStoreIds.size
    },
    activitiesByType,
    formsBreakdown: Array.from(formCounts.entries()).map(([label, value]) => ({ label, value })),
    salesAndMerchandising: {
      salesDocuments,
      totalValue
    },
    visitPlans: {
      totalVisitsDone: reports.length,
      scheduled: shifts.length,
      visitedAsScheduled: scheduledMatches,
      unscheduledVisits: Math.max(reports.length - scheduledMatches, 0),
      missedSchedule
    },
    checkInStatus: {
      // Same classification as the Review tab's check-in pill.
      missingStoreGps: reports.filter((report) => !storesWithGps.has(report.store_id)).length,
      gpsVerified: reports.filter(
        (report) =>
          storesWithGps.has(report.store_id) && report.check_in_type === "gps" && report.checkin_at
      ).length,
      remote: reports.filter(
        (report) =>
          storesWithGps.has(report.store_id) &&
          !(report.check_in_type === "gps" && report.checkin_at)
      ).length
    },
    trend: buildTrend(period, range, reports)
  };
}

function getSummaryRange(period: SummaryReportPeriod): SummaryRange {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }

  const end = new Date(start);
  if (period === "day") {
    end.setDate(end.getDate() + 1);
  } else if (period === "week") {
    end.setDate(end.getDate() + 7);
  } else if (period === "month") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }

  return { start, end };
}

function getRangeDays(range: SummaryRange) {
  const days: Date[] = [];
  const cursor = new Date(range.start);

  while (cursor < range.end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asRecord(value: Json): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function isImageUpload(name: string, type: string, url: string) {
  return (
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|heic|heif|svg)(\?|$)/i.test(`${name} ${url}`)
  );
}

// Photos come from the report's photo_items and from image uploads inside the
// SurveyJS form answers ({ name, type, content } objects, possibly in arrays).
function countFormAnswerImages(node: Json): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((total, item) => total + countFormAnswerImages(item), 0);
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, Json>;
    if (typeof record.content === "string") {
      const name = typeof record.name === "string" ? record.name : "";
      const type = typeof record.type === "string" ? record.type : "";
      return isImageUpload(name, type, record.content) ? 1 : 0;
    }

    return Object.values(record).reduce<number>(
      (total, value) => total + countFormAnswerImages(value),
      0
    );
  }

  return 0;
}

function countArray(value: Json) {
  return Array.isArray(value) ? value.length : 0;
}

function reportActivityCounts(report: VisitReportRow): ActivityCounts {
  const formAnswers = asRecord(report.form_answers);

  return {
    forms: report.form_id || report.form_name || Object.keys(formAnswers).length > 0 ? 1 : 0,
    retailAudits: isRetailAudit(report) ? 1 : 0,
    photos: countArray(report.photo_items) + countFormAnswerImages(report.form_answers),
    clientNotes: report.note?.trim() ? 1 : 0,
    voiceNotes: countArray(report.voice_note_items)
  };
}

function reportDurationMinutes(report: VisitReportRow) {
  if (!report.checked_out_at) {
    return 0;
  }

  const start = new Date(report.started_at).getTime();
  const end = new Date(report.checked_out_at).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  return Math.floor((end - start) / 60000);
}

function isRetailAudit(report: VisitReportRow) {
  const name = report.form_name?.toLowerCase() || "";
  return name.includes("audit") || Object.keys(asRecord(report.merchandising)).length > 0;
}

function countReportActivities(report: VisitReportRow) {
  return Object.values(reportActivityCounts(report)).reduce((total, value) => total + value, 0);
}

function extractCurrencyTotal(value: Json): number {
  const candidates: number[] = [];

  function visit(node: Json, key = "") {
    if (typeof node === "number" && /(total|value|amount|sales|revenue|price)/i.test(key)) {
      candidates.push(node);
      return;
    }

    if (typeof node === "string") {
      const parsed = Number(node.replace(/[^0-9.-]+/g, ""));
      if (!Number.isNaN(parsed) && /(total|value|amount|sales|revenue|price)/i.test(key)) {
        candidates.push(parsed);
      }
      return;
    }

    if (node && typeof node === "object" && !Array.isArray(node)) {
      for (const [childKey, childValue] of Object.entries(node)) {
        visit(childValue as Json, childKey);
      }
    }
  }

  visit(value);
  return candidates.reduce((total, candidate) => total + candidate, 0);
}

function matchScheduledVisits(reports: VisitReportRow[], shifts: ShiftRow[]) {
  const availableShiftKeys = new Map<string, number>();

  for (const shift of shifts) {
    const key = scheduledVisitKey(
      shift.promoter_user_id,
      shift.store_id,
      new Date(shift.scheduled_start_at)
    );
    availableShiftKeys.set(key, (availableShiftKeys.get(key) ?? 0) + 1);
  }

  let matches = 0;
  for (const report of reports) {
    const key = scheduledVisitKey(
      report.promoter_user_id,
      report.store_id,
      new Date(report.checked_out_at || report.started_at)
    );
    const available = availableShiftKeys.get(key) ?? 0;

    if (available > 0) {
      matches += 1;
      availableShiftKeys.set(key, available - 1);
    }
  }

  return matches;
}

function scheduledVisitKey(promoterUserId: string, storeId: string, date: Date) {
  return `${promoterUserId}:${storeId}:${dayKey(date)}`;
}

function averageByDay(
  reports: VisitReportRow[],
  days: Date[],
  selector: (report: VisitReportRow) => string
) {
  if (days.length === 0) {
    return 0;
  }

  const total = days.reduce((sum, date) => {
    const key = dayKey(date);
    const values = new Set(
      reports
        .filter((report) => dayKey(new Date(report.checked_out_at || report.started_at)) === key)
        .map(selector)
    );
    return sum + values.size;
  }, 0);

  return total / days.length;
}

function formatPeriodLabel(period: SummaryReportPeriod, range: SummaryRange) {
  if (period === "day") {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(range.start);
  }

  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
  const endInclusive = new Date(range.end);
  endInclusive.setDate(endInclusive.getDate() - 1);
  return `${formatter.format(range.start)} - ${formatter.format(endInclusive)}`;
}

function buildTrend(period: SummaryReportPeriod, range: SummaryRange, reports: VisitReportRow[]) {
  return getTrendBuckets(period, range).map((bucket) => {
    const bucketReports = reports.filter((report) => {
      const occurredAt = new Date(report.checked_out_at || report.started_at).getTime();
      return occurredAt >= bucket.start.getTime() && occurredAt < bucket.end.getTime();
    });

    return {
      label: bucket.label,
      reps: new Set(bucketReports.map((report) => report.promoter_user_id)).size,
      clientVisits: bucketReports.length,
      activities: bucketReports.reduce((total, report) => total + countReportActivities(report), 0)
    };
  });
}

function getTrendBuckets(period: SummaryReportPeriod, range: SummaryRange) {
  const buckets: Array<{ end: Date; label: string; start: Date }> = [];
  const cursor = new Date(range.start);

  if (period === "day") {
    const formatter = new Intl.DateTimeFormat("en", { hour: "numeric" });
    for (let hour = 0; hour < 24; hour += 1) {
      const start = new Date(range.start);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      buckets.push({ start, end, label: formatter.format(start) });
    }
    return buckets;
  }

  if (period === "year") {
    const formatter = new Intl.DateTimeFormat("en", { month: "short" });
    while (cursor < range.end) {
      const start = new Date(cursor);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      buckets.push({ start, end, label: formatter.format(start) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  while (cursor < range.end) {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    buckets.push({ start, end, label: formatter.format(start) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}
