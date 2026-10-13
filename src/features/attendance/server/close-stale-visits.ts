import "server-only";

import { createSupabaseAdminClient } from "@/shared/supabase/server";

const APP_TIME_ZONE = "Asia/Dubai";

/**
 * Closes visits that were checked in on a previous day (Dubai time) and never checked out.
 * Best-effort: a failure is logged and must not break the page that triggered it.
 */
export async function closeStaleVisitReports() {
  const { error } = await createSupabaseAdminClient().rpc("close_stale_visit_reports", {
    p_time_zone: APP_TIME_ZONE
  });

  if (error) {
    console.error("[closeStaleVisitReports] Failed to close stale visits:", error);
  }
}
