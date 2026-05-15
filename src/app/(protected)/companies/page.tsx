import { redirect } from "next/navigation";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient } from "@/shared/supabase/server";
import { CompaniesTable, type CompanyTableRow } from "./CompaniesTable";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  created_at: string;
};

type UserRow = {
  tenant_id: string;
  is_active: boolean;
};

export default async function CompaniesPage() {
  const session = await createAuthService().requireSession();

  if (!session.roles.includes("admin")) {
    redirect("/activities");
  }

  const admin = createSupabaseAdminClient();
  const [companiesResult, { data: users }] = await Promise.all([
    admin
      .from("tenants")
      .select("id, name, slug, is_active, created_at")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    admin.from("users").select("tenant_id, is_active").is("deleted_at", null)
  ]);
  let companies = companiesResult.data as CompanyRow[] | null;

  if (companiesResult.error?.code === "42703") {
    const fallback = await admin
      .from("tenants")
      .select("id, name, slug, created_at")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    companies = fallback.data as CompanyRow[] | null;
  } else if (companiesResult.error) {
    throw companiesResult.error;
  }

  const userCounts = new Map<string, { total: number; active: number }>();

  for (const user of ((users as UserRow[] | null) || [])) {
    const current = userCounts.get(user.tenant_id) || { total: 0, active: 0 };
    current.total += 1;
    current.active += user.is_active ? 1 : 0;
    userCounts.set(user.tenant_id, current);
  }

  const tableCompanies: CompanyTableRow[] = ((companies as CompanyRow[] | null) || []).map(
    (company) => {
      const counts = userCounts.get(company.id) || { total: 0, active: 0 };

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        isActive: company.is_active ?? true,
        userCount: counts.total,
        activeUserCount: counts.active,
        createdAt: company.created_at
      };
    }
  );

  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Companies
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage company names and access status across tenants.
          </p>
        </div>
      </div>

      <CompaniesTable companies={tableCompanies} currentCompanyId={session.user.tenantId} />
    </main>
  );
}
