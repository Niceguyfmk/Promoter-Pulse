import "server-only";

import { AppError } from "@/core/errors/app-error";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/shared/supabase/server";
import type { Database, Json } from "@/shared/supabase/database.types";
import {
  DEFAULT_ALLOWED_RADIUS_METERS,
  validateGpsCheckIn,
  type GpsCheckInMetadata
} from "../lib/gps-validation";

type StoreRow = Database["public"]["Tables"]["retail_stores"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type VisitReportRow = Database["public"]["Tables"]["visit_reports"]["Row"];

export type VisitReportWithRelations = VisitReportRow & {
  retail_stores?: Pick<
    StoreRow,
    "name" | "address" | "city" | "country" | "latitude" | "longitude" | "allowed_radius_meters"
  > | null;
  users?: Pick<UserRow, "full_name" | "email"> | null;
};

export type VisitReportPayload = {
  reportId: string;
  storeId: string;
  formAnswers: Record<string, string>;
  photoItems: Array<{ label: string; name: string; size: number; file: File }>;
  note: string | null;
  salesNumbers: Record<string, string>;
  merchandising: Record<string, string>;
  submit: boolean;
};

export type VisitReportPhotoItem = {
  label: string;
  name: string;
  size: number;
  bucket: string;
  path: string;
  contentType: string;
  url?: string;
};

const VISIT_REPORT_PHOTO_BUCKET = "visit-report-photos";
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

let visitReportPhotoBucketReady: Promise<void> | null = null;

export type ReportStatusFilter = "all" | "under-review" | "accepted" | "rejected";
function isMissingVisitReportsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === "42P01";
}

function visitReportStoreError(error: unknown) {
  if (isMissingVisitReportsTable(error)) {
    return new AppError(
      "INTERNAL_ERROR",
      "Visit reports are not set up in Supabase yet. Run the latest database migration, then try remote check-in again.",
      error
    );
  }

  return new AppError("INTERNAL_ERROR", "Failed to load visit report", error);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo";
}

function asVisitReportPhotoItems(value: Json): VisitReportPhotoItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is VisitReportPhotoItem => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return (
      "label" in item &&
      "name" in item &&
      "size" in item &&
      "bucket" in item &&
      "path" in item &&
      "contentType" in item &&
      typeof item.label === "string" &&
      typeof item.name === "string" &&
      typeof item.size === "number" &&
      typeof item.bucket === "string" &&
      typeof item.path === "string" &&
      typeof item.contentType === "string" &&
      (!("url" in item) || typeof item.url === "string")
    );
  });
}

export class VisitReportService {
  constructor(private readonly authService = createAuthService()) {}

  private async ensurePhotoBucket() {
    if (!visitReportPhotoBucketReady) {
      visitReportPhotoBucketReady = (async () => {
        const admin = createSupabaseAdminClient();
        const { data: bucket } = await admin.storage.getBucket(VISIT_REPORT_PHOTO_BUCKET);

        if (bucket) {
          return;
        }

        const { error } = await admin.storage.createBucket(VISIT_REPORT_PHOTO_BUCKET, {
          public: false,
          fileSizeLimit: `${MAX_PHOTO_SIZE_BYTES}`,
          allowedMimeTypes: Array.from(ALLOWED_PHOTO_TYPES)
        });

        if (error && !error.message.toLowerCase().includes("already exists")) {
          throw new AppError("INTERNAL_ERROR", "Failed to provision photo storage", error);
        }
      })().catch((error) => {
        visitReportPhotoBucketReady = null;
        throw error;
      });
    }

    await visitReportPhotoBucketReady;
  }

  private async uploadVisitReportPhotos(args: {
    tenantId: string;
    reportId: string;
    storeId: string;
    files: VisitReportPayload["photoItems"];
  }) {
    if (args.files.length === 0) {
      return [] as VisitReportPhotoItem[];
    }

    await this.ensurePhotoBucket();
    const admin = createSupabaseAdminClient();

    return Promise.all(
      args.files.map(async (item) => {
        if (item.size > MAX_PHOTO_SIZE_BYTES) {
          throw new AppError("VALIDATION_ERROR", `${item.label} exceeds the 10 MB upload limit`);
        }

        const contentType = item.file.type || "application/octet-stream";
        if (!ALLOWED_PHOTO_TYPES.has(contentType)) {
          throw new AppError("VALIDATION_ERROR", `${item.label} must be a JPG, PNG, WebP, or HEIC image`);
        }

        const storagePath = [
          args.tenantId,
          args.storeId,
          args.reportId,
          `${crypto.randomUUID()}-${sanitizeFileName(item.name)}`
        ].join("/");

        const { error } = await admin.storage
          .from(VISIT_REPORT_PHOTO_BUCKET)
          .upload(storagePath, item.file, { contentType, upsert: false });

        if (error) {
          throw new AppError("INTERNAL_ERROR", `Failed to upload ${item.label.toLowerCase()}`, error);
        }

        return {
          label: item.label,
          name: item.name,
          size: item.size,
          bucket: VISIT_REPORT_PHOTO_BUCKET,
          path: storagePath,
          contentType
        } satisfies VisitReportPhotoItem;
      })
    );
  }

  private async withSignedPhotoUrls(items: VisitReportPhotoItem[]) {
    if (items.length === 0) {
      return items;
    }

    const admin = createSupabaseAdminClient();

    return Promise.all(
      items.map(async (item) => {
        const { data, error } = await admin.storage.from(item.bucket).createSignedUrl(item.path, 60 * 60);
        if (error || !data?.signedUrl) {
          console.error("[VisitReportService] Failed to sign photo URL:", error);
          return item;
        }

        return {
          ...item,
          url: data.signedUrl
        };
      })
    );
  }

  async getPlace(storeId: string) {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("retail_stores")
      .select("*")
      .eq("id", storeId)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (error || !data) {
      throw new AppError("NOT_FOUND", "Place not found");
    }

    return data as StoreRow;
  }

  async getActiveReportForPlace(storeId: string) {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("visit_reports")
      .select("*")
      .eq("tenant_id", session.user.tenantId)
      .eq("store_id", storeId)
      .eq("promoter_user_id", session.user.id)
      .eq("status", "draft")
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("[VisitReportService] Failed to load active visit report:", error);
      throw visitReportStoreError(error);
    }

    return data as VisitReportRow | null;
  }

  async getEditableReport(reportId: string) {
    const session = await this.authService.requireSession();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("visit_reports")
      .select("*")
      .eq("id", reportId)
      .eq("tenant_id", session.user.tenantId)
      .eq("promoter_user_id", session.user.id)
      .in("status", ["draft", "rejected"])
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("[VisitReportService] Failed to load editable report:", error);
      throw visitReportStoreError(error);
    }

    return data as VisitReportRow | null;
  }

  async startRemoteCheckIn(storeId: string) {
    return this.startCheckIn(storeId, "remote");
  }

  async startGpsCheckIn(storeId: string, metadata: GpsCheckInMetadata) {
    return this.startCheckIn(storeId, "gps", metadata);
  }

  private async startCheckIn(storeId: string, checkInType: "remote" | "gps", metadata?: GpsCheckInMetadata) {
    const session = await this.authService.requireSession();
    if (!session.roles.includes("promoter") || session.roles.some((role) => role === "admin" || role === "manager")) {
      throw new AppError("FORBIDDEN", "Only promoters can start remote check-in");
    }

    const supabase = await createSupabaseServerClient();

    const { data: store, error: storeError } = await supabase
      .from("retail_stores")
      .select("id, latitude, longitude, allowed_radius_meters, geofence_radius_meters")
      .eq("id", storeId)
      .eq("tenant_id", session.user.tenantId)
      .single();

    if (storeError || !store) {
      throw new AppError("NOT_FOUND", "Place not found");
    }

    const [{ data: assignment }, { data: shift }] = await Promise.all([
      supabase
        .from("place_promoter_assignments")
        .select("store_id")
        .eq("store_id", storeId)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("shifts")
        .select("id")
        .eq("store_id", storeId)
        .eq("promoter_user_id", session.user.id)
        .eq("tenant_id", session.user.tenantId)
        .limit(1)
        .maybeSingle()
    ]);

    if (!assignment && !shift) {
      throw new AppError("FORBIDDEN", "This place is not assigned to you");
    }

    let gpsUpdate:
      | Pick<
          Database["public"]["Tables"]["visit_reports"]["Insert"],
          "checkin_lat" | "checkin_lng" | "checkin_accuracy" | "checkin_at" | "checkin_distance_meters"
        >
      | undefined;

    if (checkInType === "gps") {
      if (!metadata) {
        throw new AppError("VALIDATION_ERROR", "GPS check-in metadata is required");
      }

      if (store.latitude == null || store.longitude == null) {
        throw new AppError("VALIDATION_ERROR", "This place does not have GPS coordinates configured");
      }

      const validation = validateGpsCheckIn(metadata, {
        latitude: Number(store.latitude),
        longitude: Number(store.longitude),
        allowedRadiusMeters:
          store.allowed_radius_meters ?? store.geofence_radius_meters ?? DEFAULT_ALLOWED_RADIUS_METERS
      });

      if (!validation.allowed) {
        throw new AppError("VALIDATION_ERROR", validation.message);
      }

      gpsUpdate = {
        checkin_lat: metadata.latitude,
        checkin_lng: metadata.longitude,
        checkin_accuracy: metadata.accuracy,
        checkin_at: metadata.timestamp,
        checkin_distance_meters: Number(validation.distanceMeters.toFixed(2))
      };
    }

    const existing = await this.getActiveReportForPlace(storeId);
    if (existing) {
      return existing;
    }

    const insertClient = checkInType === "gps" ? createSupabaseAdminClient() : supabase;
    const { data, error } = await insertClient
      .from("visit_reports")
      .insert({
        tenant_id: session.user.tenantId,
        store_id: storeId,
        promoter_user_id: session.user.id,
        check_in_type: checkInType,
        status: "draft",
        ...gpsUpdate
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[VisitReportService] Failed to start remote check-in:", error);
      if (error && isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to start remote check-in", error);
    }

    return data as VisitReportRow;
  }

  async saveVisitReport(payload: VisitReportPayload) {
    const session = await this.authService.requireSession();
    const supabase = createSupabaseAdminClient();
    const existingReport = await this.getEditableReport(payload.reportId);

    if (!existingReport || existingReport.store_id !== payload.storeId) {
      throw new AppError("INVALID_STATE", "This report can no longer be edited");
    }

    const existingPhotoItems = asVisitReportPhotoItems(existingReport.photo_items);
    const uploadedPhotoItems = await this.uploadVisitReportPhotos({
      tenantId: session.user.tenantId,
      reportId: payload.reportId,
      storeId: payload.storeId,
      files: payload.photoItems
    });
    const mergedPhotoItems = new Map(existingPhotoItems.map((item) => [item.label, item]));

    for (const item of uploadedPhotoItems) {
      mergedPhotoItems.set(item.label, item);
    }

    const updates = {
      form_name: "Daily Check-in",
      form_answers: payload.formAnswers as Json,
      ...(mergedPhotoItems.size > 0 ? { photo_items: Array.from(mergedPhotoItems.values()) as Json } : {}),
      note: payload.note,
      sales_numbers: payload.salesNumbers as Json,
      merchandising: payload.merchandising as Json,
      ...(payload.submit
        ? {
            status: "submitted" as const,
            checked_out_at: new Date().toISOString(),
            reviewed_by_user_id: null,
            reviewed_at: null,
            review_note: null
          }
        : {}),
      updated_at: new Date().toISOString()
    } satisfies Database["public"]["Tables"]["visit_reports"]["Update"];

    const { data, error } = await supabase
      .from("visit_reports")
      .update(updates)
      .eq("id", payload.reportId)
      .eq("store_id", payload.storeId)
      .eq("promoter_user_id", session.user.id)
      .eq("tenant_id", session.user.tenantId)
      .in("status", ["draft", "rejected"])
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[VisitReportService] Failed to save visit report:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to save visit report", error);
    }

    if (!data) {
      throw new AppError("INVALID_STATE", "This report can no longer be edited");
    }
  }

  async getReportForReview(reportId: string) {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");

    if (!isAdmin && !isManager) {
      throw new AppError("FORBIDDEN", "Only managers can review reports");
    }

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("visit_reports")
      .select(`
        *,
        retail_stores!visit_reports_store_id_fkey(name, address, city, country, latitude, longitude, allowed_radius_meters),
        users!visit_reports_promoter_user_id_fkey(full_name, email)
      `)
      .eq("id", reportId)
      .is("deleted_at", null);

    if (!isAdmin) {
      query = query.eq("tenant_id", session.user.tenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[VisitReportService] Failed to load report:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to load report", error);
    }

    if (!data) {
      return null;
    }

    const report = data as unknown as VisitReportWithRelations;
    report.photo_items = (await this.withSignedPhotoUrls(asVisitReportPhotoItems(report.photo_items))) as Json;

    return report;
  }

  async listReportsForReview(filters?: {
    formName?: string | undefined;
    promoterName?: string | undefined;
    submittedDate?: string | undefined;
    status?: ReportStatusFilter;
  }) {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");

    if (!isAdmin && !isManager) {
      throw new AppError("FORBIDDEN", "Only managers can review reports");
    }

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("visit_reports")
      .select(`
        *,
        retail_stores!visit_reports_store_id_fkey(name, address, city, country, latitude, longitude, allowed_radius_meters),
        users!visit_reports_promoter_user_id_fkey(full_name, email)
      `)
      .is("deleted_at", null)
      .order("checked_out_at", { ascending: false, nullsFirst: false })
      .order("started_at", { ascending: false })
      .limit(50);

    if (!isAdmin) {
      query = query.eq("tenant_id", session.user.tenantId);
    }

    if (filters?.formName) {
      query = query.ilike("form_name", `%${filters.formName}%`);
    }

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status === "under-review" ? "submitted" : filters.status);
    }

    if (filters?.submittedDate) {
      const start = new Date(`${filters.submittedDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query = query.gte("checked_out_at", start.toISOString()).lt("checked_out_at", end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[VisitReportService] Failed to load reports:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to load reports", error);
    }

    const reports = (data ?? []) as unknown as VisitReportWithRelations[];
    if (!filters?.promoterName) {
      return reports;
    }

    const promoterName = filters.promoterName.toLowerCase();
    return reports.filter((report) => {
      const name = report.users?.full_name || report.users?.email || "";
      return name.toLowerCase().includes(promoterName);
    });
  }

  async listPromoterReports(filters: {
    formName?: string | undefined;
    submittedDate?: string | undefined;
    status?: ReportStatusFilter;
  }) {
    const session = await this.authService.requireSession();
    if (!session.roles.includes("promoter") || session.roles.some((role) => role === "admin" || role === "manager")) {
      throw new AppError("FORBIDDEN", "Only promoters can view their reports");
    }

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("visit_reports")
      .select(`
        *,
        retail_stores!visit_reports_store_id_fkey(name, address, city, country, latitude, longitude, allowed_radius_meters)
      `)
      .eq("tenant_id", session.user.tenantId)
      .eq("promoter_user_id", session.user.id)
      .neq("status", "draft")
      .is("deleted_at", null)
      .order("checked_out_at", { ascending: false, nullsFirst: false });

    if (filters.formName) {
      query = query.ilike("form_name", `%${filters.formName}%`);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status === "under-review" ? "submitted" : filters.status);
    }

    if (filters.submittedDate) {
      const start = new Date(`${filters.submittedDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query = query.gte("checked_out_at", start.toISOString()).lt("checked_out_at", end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[VisitReportService] Failed to load promoter reports:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to load reports", error);
    }

    return (data ?? []) as unknown as VisitReportWithRelations[];
  }

  async reviewReport(reportId: string, status: "accepted" | "rejected", reviewNote: string | null) {
    const session = await this.authService.requireSession();
    if (!session.roles.some((role) => role === "admin" || role === "manager")) {
      throw new AppError("FORBIDDEN", "Only managers can review reports");
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("visit_reports")
      .update({
        status,
        reviewed_by_user_id: session.user.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote,
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId)
      .eq("tenant_id", session.user.tenantId)
      .eq("status", "submitted");

    if (error) {
      console.error("[VisitReportService] Failed to review report:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to review report", error);
    }
  }

  async deleteReport(reportId: string) {
    const session = await this.authService.requireSession();
    const isAdmin = session.roles.includes("admin");
    const isManager = session.roles.includes("manager");

    if (!isAdmin && !isManager) {
      throw new AppError("FORBIDDEN", "Only managers can delete reports");
    }

    const admin = createSupabaseAdminClient();
    let query = admin
      .from("visit_reports")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId)
      .is("deleted_at", null)
      .select("id");

    if (!isAdmin) {
      query = query.eq("tenant_id", session.user.tenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("[VisitReportService] Failed to delete report:", error);
      if (isMissingVisitReportsTable(error)) {
        throw visitReportStoreError(error);
      }
      throw new AppError("INTERNAL_ERROR", "Failed to delete report", error);
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "Report not found");
    }
  }
}

export function createVisitReportService() {
  return new VisitReportService();
}
