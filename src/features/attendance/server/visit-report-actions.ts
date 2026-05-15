"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { isAppError } from "@/core/errors/app-error";
import type { GpsCheckInMetadata } from "../lib/gps-validation";
import { createVisitReportService } from "./visit-report-service";

function text(formData: FormData, key: string) {
  const value = (formData.get(key) as string | null)?.trim();
  return value ? value : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function numeric(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : null;
}

function fileSummary(formData: FormData, key: string, label: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    label,
    name: file.name,
    size: file.size,
    file
  };
}

export async function startRemoteCheckInAction(formData: FormData) {
  const storeId = formData.get("storeId") as string;
  await createVisitReportService().startRemoteCheckIn(storeId);
  revalidatePath("/places");
  redirect(`/places/${storeId}` as Route);
}

export type RemoteCheckInState = {
  error: string | null;
};

export type GpsCheckInState = {
  error: string | null;
};

export async function startRemoteCheckInFormAction(
  _state: RemoteCheckInState,
  formData: FormData
): Promise<RemoteCheckInState> {
  const storeId = formData.get("storeId") as string;

  try {
    await createVisitReportService().startRemoteCheckIn(storeId);
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to start remote check-in"
    };
  }

  revalidatePath("/places");
  redirect(`/places/${storeId}` as Route);
}

export async function startGpsCheckInAction(formData: FormData): Promise<GpsCheckInState> {
  const storeId = formData.get("storeId") as string;
  const latitude = numeric(formData, "latitude");
  const longitude = numeric(formData, "longitude");
  const accuracy = numeric(formData, "accuracy");
  const timestamp = String(formData.get("timestamp") ?? "");

  if (!storeId || latitude == null || longitude == null || accuracy == null || Number.isNaN(Date.parse(timestamp))) {
    return { error: "Invalid GPS check-in data. Please retry." };
  }

  const metadata: GpsCheckInMetadata = {
    latitude,
    longitude,
    accuracy,
    timestamp
  };

  try {
    await createVisitReportService().startGpsCheckIn(storeId, metadata);
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to start GPS check-in"
    };
  }

  revalidatePath("/places");
  redirect(`/places/${storeId}` as Route);
}

export async function saveVisitReportAction(formData: FormData) {
  const reportId = formData.get("reportId") as string;
  const storeId = formData.get("storeId") as string;
  const submit = formData.get("intent") === "submit";
  const photoItems = [
    fileSummary(formData, "selfiePhoto", "Selfie in-store"),
    fileSummary(formData, "displayPhoto", "Complete display and fixture")
  ].filter((item): item is { label: string; name: string; size: number; file: File } => Boolean(item));

  await createVisitReportService().saveVisitReport({
    reportId,
    storeId,
    submit,
    formAnswers: {
      interactions: text(formData, "interactions"),
      demos: text(formData, "demos"),
      demosWithPhoto: text(formData, "demosWithPhoto")
    },
    photoItems,
    note: optionalText(formData, "note"),
    salesNumbers: {
      coreProducts: text(formData, "coreProducts"),
      accessories: text(formData, "accessories")
    },
    merchandising: {
      displayFixtureComplete: text(formData, "displayFixtureComplete")
    }
  });

  revalidatePath(`/places/${storeId}`);
  revalidatePath("/reports");

  if (submit) {
    redirect("/places" as Route);
  }

  redirect("/reports" as Route);
}

export async function reviewVisitReportAction(formData: FormData) {
  const reportId = formData.get("reportId") as string;
  const status = formData.get("status") === "accepted" ? "accepted" : "rejected";
  const reviewNote = optionalText(formData, "reviewNote");
  await createVisitReportService().reviewReport(reportId, status, reviewNote);
  revalidatePath("/reports");
}

export async function deleteVisitReportAction(formData: FormData) {
  const reportId = formData.get("reportId") as string;
  await createVisitReportService().deleteReport(reportId);
  revalidatePath("/reports");
  redirect("/reports" as Route);
}
