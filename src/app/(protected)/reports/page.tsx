import type { Route } from "next";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import {
  createVisitReportService,
  type VisitReportWithRelations
} from "@/features/attendance/server/visit-report-service";
import { deleteVisitReportAction, reviewVisitReportAction } from "@/features/attendance/server/visit-report-actions";
import type { Json } from "@/shared/supabase/database.types";
import { extractSurveyLabels } from "@/features/forms/lib/survey-schema";
import { FormSubmitButton, LoadingLink as Link } from "@/shared/loading";

type ReportSortColumn = "form" | "promoter" | "submitted" | "duration" | "checkin" | "status";
type ReportSortDirection = "asc" | "desc";

function asRecord(value: Json): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function flattenAnswerValue(value: Json): string {
  if (Array.isArray(value)) {
    return value.map(flattenAnswerValue).join(", ");
  }

  if (value && typeof value === "object") {
    if ("content" in value && typeof value.content === "string" && value.content) {
      return "name" in value && typeof value.name === "string" && value.name ? value.name : "Uploaded file";
    }

    return Object.entries(value)
      .map(([key, item]) => `${key}: ${flattenAnswerValue(item as Json)}`)
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value == null) {
    return "Not provided";
  }

  return String(value);
}

type SurveyUploadedAsset = {
  fieldLabel: string;
  name: string;
  url: string;
};

type ReviewAsset = {
  label: string;
  name: string;
  url: string | undefined;
};

function isSurveyUploadObject(value: Json): value is { name?: string; content: string } {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("content" in value)) {
    return false;
  }

  return typeof value.content === "string";
}

function extractSurveyUploadedAssets(entries: Array<[string, Json]>) {
  const assets: SurveyUploadedAsset[] = [];
  const nonAssetEntries: Array<[string, Json]> = [];

  for (const [key, value] of entries) {
    if (Array.isArray(value) && value.every((item) => isSurveyUploadObject(item as Json))) {
      for (const item of value) {
        if (isSurveyUploadObject(item) && item.content) {
          assets.push({
            fieldLabel: key,
            name: typeof item.name === "string" && item.name ? item.name : "Uploaded file",
            url: item.content
          });
        }
      }
      continue;
    }

    if (isSurveyUploadObject(value) && value.content) {
      assets.push({
        fieldLabel: key,
        name: typeof value.name === "string" && value.name ? value.name : "Uploaded file",
        url: value.content
      });
      continue;
    }

    nonAssetEntries.push([key, value]);
  }

  return { assets, nonAssetEntries };
}

function isImageAsset(name: string, url?: string) {
  const candidate = `${name} ${url || ""}`.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif", ".svg"].some((ext) =>
    candidate.includes(ext)
  );
}

function reportAnswerEntries(report: VisitReportWithRelations) {
  const merged = new Map<string, Json>();

  for (const [key, value] of Object.entries(asRecord(report.form_answers))) {
    merged.set(key, value);
  }

  for (const [key, value] of Object.entries(asRecord(report.sales_numbers))) {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(asRecord(report.merchandising))) {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  }

  return Array.from(merged.entries());
}

function asPhotoItems(value: Json): Array<{ label: string; name: string; size: number; url?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is { label: string; name: string; size: number; url?: string } => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return (
      "label" in item &&
      "name" in item &&
      "size" in item &&
      typeof item.label === "string" &&
      typeof item.name === "string" &&
      typeof item.size === "number" &&
      (!("url" in item) || typeof item.url === "string")
    );
  });
}

function statusLabel(status: string) {
  if (status === "submitted") {
    return "under-review";
  }

  return status;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatReportDuration(startedAt: string, checkedOutAt: string | null) {
  const start = new Date(startedAt).getTime();
  const end = checkedOutAt ? new Date(checkedOutAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "Unavailable";
  }

  const totalMinutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatLoggedHours(startedAt: string, checkedOutAt: string | null) {
  const minutes = reportDurationMinutes(startedAt, checkedOutAt);
  if (minutes < 0) {
    return "Unavailable";
  }

  return `${(minutes / 60).toFixed(2)}h`;
}

function reportDurationMinutes(startedAt: string, checkedOutAt: string | null) {
  const start = new Date(startedAt).getTime();
  const end = checkedOutAt ? new Date(checkedOutAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return -1;
  }

  return Math.floor((end - start) / 60000);
}

function isReportActive(report: VisitReportWithRelations) {
  return report.status === "draft" && !report.checked_out_at;
}

type ManagerCheckInStatus = {
  label: "GPS Verified" | "Remote" | "Missing Store GPS";
  meaning: "Valid" | "Exception" | "Setup issue";
  tone: string;
};

function managerCheckInStatus(report: VisitReportWithRelations): ManagerCheckInStatus {
  const storeHasGps = report.retail_stores?.latitude != null && report.retail_stores.longitude != null;

  if (!storeHasGps) {
    return {
      label: "Missing Store GPS",
      meaning: "Setup issue",
      tone: "bg-red-50 text-red-700 ring-red-100"
    };
  }

  if (report.check_in_type === "gps" && report.checkin_at) {
    return {
      label: "GPS Verified",
      meaning: "Valid",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100"
    };
  }

  return {
    label: "Remote",
    meaning: "Exception",
    tone: "bg-amber-50 text-amber-700 ring-amber-100"
  };
}

function managerStatusCounts(reports: VisitReportWithRelations[]) {
  return reports.reduce(
    (counts, report) => {
      counts[managerCheckInStatus(report).label] += 1;
      return counts;
    },
    {
      "GPS Verified": 0,
      Remote: 0,
      "Missing Store GPS": 0
    }
  );
}

function normalizeSortColumn(value: string | undefined): ReportSortColumn {
  switch (value) {
    case "form":
    case "promoter":
    case "duration":
    case "checkin":
    case "status":
      return value;
    case "submitted":
    default:
      return "submitted";
  }
}

function normalizePromoterSortColumn(
  value: string | undefined
): Extract<ReportSortColumn, "form" | "submitted" | "duration" | "status"> {
  switch (value) {
    case "form":
    case "duration":
    case "status":
      return value;
    case "submitted":
    default:
      return "submitted";
  }
}

function normalizeSortDirection(value: string | undefined): ReportSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function sortReports(
  reports: VisitReportWithRelations[],
  sortBy: ReportSortColumn,
  sortDirection: ReportSortDirection
) {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...reports].sort((left, right) => {
    let comparison = 0;

    switch (sortBy) {
      case "form":
        comparison = (left.form_name || "Daily Check-in").localeCompare(right.form_name || "Daily Check-in");
        break;
      case "promoter":
        comparison = (left.users?.full_name || left.users?.email || "").localeCompare(
          right.users?.full_name || right.users?.email || ""
        );
        break;
      case "duration":
        comparison =
          reportDurationMinutes(left.started_at, left.checked_out_at) -
          reportDurationMinutes(right.started_at, right.checked_out_at);
        break;
      case "checkin":
        comparison = managerCheckInStatus(left).label.localeCompare(managerCheckInStatus(right).label);
        break;
      case "status":
        comparison = statusLabel(left.status).localeCompare(statusLabel(right.status));
        break;
      case "submitted":
      default:
        comparison =
          new Date(left.checked_out_at || left.started_at).getTime() -
          new Date(right.checked_out_at || right.started_at).getTime();
        break;
    }

    if (sortBy === "submitted") {
      comparison =
        new Date(left.checked_out_at || left.started_at).getTime() -
        new Date(right.checked_out_at || right.started_at).getTime();
    }

    if (sortBy === "checkin") {
      comparison = managerCheckInStatus(left).label.localeCompare(managerCheckInStatus(right).label);
    }

    if (sortBy === "status") {
      comparison = statusLabel(left.status).localeCompare(statusLabel(right.status));
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    return (
      (new Date(left.checked_out_at || left.started_at).getTime() -
        new Date(right.checked_out_at || right.started_at).getTime()) * direction
    );
  });
}

function sortPromoterReports(
  reports: VisitReportWithRelations[],
  sortBy: Extract<ReportSortColumn, "form" | "submitted" | "duration" | "status">,
  sortDirection: ReportSortDirection
) {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...reports].sort((left, right) => {
    let comparison = 0;

    switch (sortBy) {
      case "form":
        comparison = (left.form_name || "Daily Check-in").localeCompare(right.form_name || "Daily Check-in");
        break;
      case "duration":
        comparison =
          reportDurationMinutes(left.started_at, left.checked_out_at) -
          reportDurationMinutes(right.started_at, right.checked_out_at);
        break;
      case "submitted":
        comparison =
          new Date(left.checked_out_at || left.started_at).getTime() -
          new Date(right.checked_out_at || right.started_at).getTime();
        break;
      case "status":
      default:
        comparison = statusLabel(left.status).localeCompare(statusLabel(right.status));
        break;
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    return (
      (new Date(left.checked_out_at || left.started_at).getTime() -
        new Date(right.checked_out_at || right.started_at).getTime()) * direction
    );
  });
}

function buildSortHref(
  filters: {
    formName?: string;
    promoterName?: string;
    submittedDate?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  },
  column: ReportSortColumn
) {
  const params = new URLSearchParams();

  if (filters.formName) {
    params.set("formName", filters.formName);
  }
  if (filters.promoterName) {
    params.set("promoterName", filters.promoterName);
  }
  if (filters.submittedDate) {
    params.set("submittedDate", filters.submittedDate);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }

  const activeColumn = normalizeSortColumn(filters.sortBy);
  const nextDirection =
    activeColumn === column && normalizeSortDirection(filters.sortDir) === "asc" ? "desc" : "asc";

  params.set("sortBy", column);
  params.set("sortDir", nextDirection);

  return `/reports?${params.toString()}` as Route;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{
    formName?: string;
    promoterName?: string;
    reportId?: string;
    submittedDate?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const [session, filters] = await Promise.all([createAuthService().requireSession(), searchParams]);
  const canReview = session.roles.some((role) => role === "admin" || role === "manager");
  const reportService = createVisitReportService();

  if (!canReview) {
    const reports = await reportService.listPromoterReports({
      formName: filters.formName?.trim(),
      submittedDate: filters.submittedDate,
      status:
        filters.status === "under-review" || filters.status === "accepted" || filters.status === "rejected"
          ? filters.status
          : "all"
    });
    const sortedReports = sortPromoterReports(
      reports,
      normalizePromoterSortColumn(filters.sortBy),
      normalizeSortDirection(filters.sortDir)
    );

    return (
      <main className="space-y-6 lg:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Promoter reports</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Reports</h1>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-sm">
            {reports.length} reports
          </span>
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(180px,1fr)_180px_180px_auto]">
          <input
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            defaultValue={filters.formName || ""}
            name="formName"
            placeholder="Filter by form name"
          />
          <input
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            defaultValue={filters.submittedDate || ""}
            name="submittedDate"
            type="date"
          />
          <select
            className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            defaultValue={filters.status || "all"}
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="under-review">Under review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <FormSubmitButton className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white" loadingLabel="Filtering..." type="submit">
            Filter
          </FormSubmitButton>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <SortableHeader column="form" filters={filters} label="Form" />
                  <SortableHeader column="submitted" filters={filters} label="Date submitted" />
                  <SortableHeader column="duration" filters={filters} label="Hours logged" />
                  <th className="px-5 py-4">Active</th>
                  <SortableHeader column="status" filters={filters} label="Status" />
                  <th className="px-5 py-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedReports.length > 0 ? (
                  sortedReports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {report.form_name || "Daily Check-in"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(report.checked_out_at)}</td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {formatLoggedHours(report.started_at, report.checked_out_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            isReportActive(report) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isReportActive(report) ? "Active" : "Closed"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={report.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {report.status === "rejected" ? (
                          <Link
                            className="inline-flex h-10 items-center rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-700"
                            href={`/places/${report.store_id}?reportId=${report.id}` as Route}
                          >
                            Edit
                          </Link>
                        ) : (
                          <span className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-400">
                            Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                      No reports match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  if (filters.reportId) {
    const report = await reportService.getReportForReview(filters.reportId);

    if (!report) {
      return (
        <main className="space-y-6 lg:space-y-8">
          <Link className="text-sm font-bold text-slate-600 hover:text-slate-950" href="/reports">
            Back to reports
          </Link>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 px-8 py-16 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Report not found</h3>
          </div>
        </main>
      );
    }

    return <ManagerReportDetail report={report} />;
  }

  const reports = await reportService.listReportsForReview({
    formName: filters.formName?.trim(),
    promoterName: filters.promoterName?.trim(),
    submittedDate: filters.submittedDate,
    status:
      filters.status === "under-review" || filters.status === "accepted" || filters.status === "rejected"
        ? filters.status
        : "all"
  });
  const sortedReports = sortReports(
    reports,
    normalizeSortColumn(filters.sortBy),
    normalizeSortDirection(filters.sortDir)
  );
  const statusCounts = managerStatusCounts(sortedReports);

  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Manager review</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Reports</h1>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-sm">
          {reports.length} reports
        </span>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <ManagerStatusCard
          count={statusCounts["GPS Verified"]}
          label="GPS Verified"
          meaning="Valid"
          tone="border-emerald-100 bg-emerald-50 text-emerald-800"
        />
        <ManagerStatusCard
          count={statusCounts.Remote}
          label="Remote"
          meaning="Exception"
          tone="border-amber-100 bg-amber-50 text-amber-800"
        />
        <ManagerStatusCard
          count={statusCounts["Missing Store GPS"]}
          label="Missing Store GPS"
          meaning="Setup issue"
          tone="border-red-100 bg-red-50 text-red-800"
        />
      </section>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_180px_180px_auto]">
        <input
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          defaultValue={filters.formName || ""}
          name="formName"
          placeholder="Filter by form name"
        />
        <input
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          defaultValue={filters.promoterName || ""}
          name="promoterName"
          placeholder="Filter by promoter"
        />
        <input
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          defaultValue={filters.submittedDate || ""}
          name="submittedDate"
          type="date"
        />
        <select
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          defaultValue={filters.status || "all"}
          name="status"
        >
          <option value="all">All statuses</option>
          <option value="under-review">Under review</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <FormSubmitButton className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white" loadingLabel="Filtering..." type="submit">
          Filter
        </FormSubmitButton>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <SortableHeader column="form" filters={filters} label="Form" />
                <SortableHeader column="promoter" filters={filters} label="Promoter" />
                <SortableHeader column="submitted" filters={filters} label="Date submitted" />
                <SortableHeader column="duration" filters={filters} label="Duration" />
                <SortableHeader column="checkin" filters={filters} label="Check-in" />
                <SortableHeader column="status" filters={filters} label="Status" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedReports.length > 0 ? (
                sortedReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      <Link className="text-slate-950 underline-offset-4 hover:underline" href={`/reports?reportId=${report.id}`}>
                        {report.form_name || "Daily Check-in"}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {report.users?.full_name || report.users?.email || "Unknown promoter"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(report.checked_out_at)}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {formatReportDuration(report.started_at, report.checked_out_at)}
                    </td>
                    <td className="px-5 py-4">
                      <ManagerCheckInPill report={report} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={report.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                    No reports match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ManagerReportDetail({ report }: { report: VisitReportWithRelations }) {
  const { assets: surveyAssets, nonAssetEntries: answerEntries } = extractSurveyUploadedAssets(reportAnswerEntries(report));
  const schemaLabels = extractSurveyLabels(report.survey_forms?.schema_json ?? {});

  const photoItems = asPhotoItems(report.photo_items);
  const allAssets: ReviewAsset[] = [
    ...photoItems.map((item) => ({
      label: item.label,
      name: item.name,
      url: item.url
    })),
    ...surveyAssets.map((item) => ({
      label: schemaLabels[item.fieldLabel] || item.fieldLabel,
      name: item.name,
      url: item.url
    }))
  ];
  const assetsByLabel = new Map<string, ReviewAsset[]>();

  for (const asset of allAssets) {
    const existing = assetsByLabel.get(asset.label) ?? [];
    existing.push(asset);
    assetsByLabel.set(asset.label, existing);
  }

  return (
    <main className="space-y-6 lg:space-y-8">
      <Link className="text-sm font-bold text-slate-600 hover:text-slate-950" href="/reports">
        Back to reports
      </Link>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-6 p-5 lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={report.status} />
              <ManagerCheckInPill report={report} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {report.form_name || "Daily Check-in"}
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {report.retail_stores?.name || "Unknown place"} by{" "}
              {report.users?.full_name || report.users?.email || "Unknown promoter"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Submitted {formatDate(report.checked_out_at)}</p>
            <p className="mt-1 text-sm text-slate-500">
              Checked in for {formatReportDuration(report.started_at, report.checked_out_at)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Hours logged {formatLoggedHours(report.started_at, report.checked_out_at)}
            </p>
          </div>

          <section className="space-y-3">
            {answerEntries.length > 0 ? (
              answerEntries.map(([key, value]) => (
                <SummaryItem key={key} label={schemaLabels[key] || key} value={flattenAnswerValue(value)} />
              ))
            ) : (
              <SummaryItem label="Answers" value="No answers captured" />
            )}

            {Array.from(assetsByLabel.entries()).map(([label, assets]) => (
              <AssetAnswerItem assets={assets} key={label} label={label} />
            ))}
          </section>

          {report.note ? (
            <p className="rounded-2xl bg-slate-50/80 p-5 text-sm leading-6 text-slate-600">
              {report.note}
            </p>
          ) : null}

          <section className="rounded-[24px] bg-slate-50/80 p-5">
            {report.status === "submitted" ? (
              <div className="space-y-4">
                <form action={reviewVisitReportAction} className="space-y-4">
                  <input name="reportId" type="hidden" value={report.id} />
                  <textarea
                    className="min-h-36 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    name="reviewNote"
                    placeholder="Manager review note"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormSubmitButton
                      className="h-12 rounded-xl bg-red-50 text-sm font-bold text-red-700 transition hover:bg-red-100"
                      loadingLabel="Rejecting..."
                      name="status"
                      type="submit"
                      value="rejected"
                    >
                      Reject
                    </FormSubmitButton>
                    <FormSubmitButton
                      className="h-12 rounded-xl bg-teal-600 text-sm font-bold text-white transition hover:bg-teal-700"
                      loadingLabel="Accepting..."
                      name="status"
                      type="submit"
                      value="accepted"
                    >
                      Accept
                    </FormSubmitButton>
                  </div>
                </form>
                <form action={deleteVisitReportAction}>
                  <input name="reportId" type="hidden" value={report.id} />
                  <FormSubmitButton
                    className="h-12 w-full rounded-xl border border-red-200 bg-white text-sm font-bold text-red-700 transition hover:bg-red-50"
                    loadingLabel="Deleting..."
                    type="submit"
                  >
                    Delete report
                  </FormSubmitButton>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                <p className="text-sm font-semibold text-slate-800">Review complete</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {report.review_note || "No manager note added."}
                </p>
                </div>
                <form action={deleteVisitReportAction}>
                  <input name="reportId" type="hidden" value={report.id} />
                  <FormSubmitButton
                    className="h-12 w-full rounded-xl border border-red-200 bg-white text-sm font-bold text-red-700 transition hover:bg-red-50"
                    loadingLabel="Deleting..."
                    type="submit"
                  >
                    Delete report
                  </FormSubmitButton>
                </form>
              </div>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}

function ManagerStatusCard({
  count,
  label,
  meaning,
  tone
}: {
  count: number;
  label: ManagerCheckInStatus["label"];
  meaning: ManagerCheckInStatus["meaning"];
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">{meaning}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{label}</h2>
        <span className="text-3xl font-semibold tabular-nums">{count}</span>
      </div>
    </div>
  );
}


function SortableHeader({
  column,
  filters,
  label
}: {
  column: ReportSortColumn;
  filters: {
    formName?: string;
    promoterName?: string;
    submittedDate?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  };
  label: string;
}) {
  const activeColumn = normalizeSortColumn(filters.sortBy);
  const activeDirection = normalizeSortDirection(filters.sortDir);
  const indicator = activeColumn === column ? (activeDirection === "asc" ? " ↑" : " ↓") : "";

  return (
    <th className="px-5 py-4">
      <Link className="inline-flex items-center hover:text-slate-600" href={buildSortHref(filters, column)}>
        {label}
        <span aria-hidden="true">{indicator}</span>
      </Link>
    </th>
  );
}

function ManagerCheckInPill({ report }: { report: VisitReportWithRelations }) {
  const status = managerCheckInStatus(report);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${status.tone}`}>
      {status.label} · {status.meaning}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "accepted"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value || "Not provided"}</p>
    </div>
  );
}

function AssetAnswerItem({ assets, label }: { assets: ReviewAsset[]; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        {assets.map((asset) =>
          isImageAsset(asset.name, asset.url) && asset.url ? (
            <a
              className="block w-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-slate-300 shrink-0"
              href={asset.url}
              key={`${label}-${asset.name}`}
              rel="noreferrer"
              target="_blank"
            >
              <img alt={asset.name} className="h-48 w-full object-cover" src={asset.url} />
              <div className="truncate border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">{asset.name}</div>
            </a>
          ) : (
            <div className="text-sm text-slate-700" key={`${label}-${asset.name}`}>
              {asset.url ? (
                <a
                  className="text-teal-700 underline underline-offset-4"
                  href={asset.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {asset.name}
                </a>
              ) : (
                asset.name
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
