import "server-only";

import { getServerEnv } from "@/shared/config/env";
import { createSupabaseAdminClient } from "@/shared/supabase/server";

/**
 * Closes visits that were checked in on a previous day and never checked out.
 * Best-effort: a failure is logged and must not break the page that triggered it.
 */
export async function closeStaleVisitReports() {
  const { error } = await createSupabaseAdminClient().rpc("close_stale_visit_reports", {
    p_time_zone: getServerEnv().APP_TIME_ZONE
  });

  if (error) {
    console.error("[closeStaleVisitReports] Failed to close stale visits:", error);
  }
}
