import { notFound, redirect } from "next/navigation";

import { RemoteVisitWorkspace } from "@/features/attendance/components/RemoteVisitWorkspace";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createVisitReportService } from "@/features/attendance/server/visit-report-service";
import { createFormsService } from "@/features/forms/server/forms-service";

export default async function PlaceVisitPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reportId?: string }>;
}) {
  const [{ id }, { reportId }, session] = await Promise.all([
    params,
    searchParams,
    createAuthService().requireSession()
  ]);
  const canManage = session.roles.some((role) => role === "admin" || role === "manager");

  if (canManage) {
    redirect(`/places/${id}/edit`);
  }

  const service = createVisitReportService();
  const [store, report, assignedForms] = await Promise.all([
    service.getPlace(id).catch(() => null),
    reportId ? service.getEditableReport(reportId) : service.getActiveReportForPlace(id),
    createFormsService().listAssignedFormsForStore(id)
  ]);

  if (!store) {
    notFound();
  }

  if (!report || report.store_id !== id) {
    redirect("/places");
  }

  return (
    <RemoteVisitWorkspace
      assignedForms={assignedForms}
      report={report}
      store={{
        id: store.id,
        name: store.name,
        address: store.address,
        city: store.city,
        country: store.country
      }}
    />
  );
}
