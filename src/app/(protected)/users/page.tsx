import { redirect } from "next/navigation";

import type { Role } from "@/core/auth/roles";
import { inviteUser } from "@/features/auth/server/auth-actions";
import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createSupabaseAdminClient } from "@/shared/supabase/server";
import { UsersTable, type UsersTableRow } from "./UsersTable";
import { FormSubmitButton } from "@/shared/loading";

async function inviteUserFromPage(formData: FormData) {
  "use server";

  const result = await inviteUser(formData);
  console.log("INVITE RESULT:", result);
}

type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

type TenantRow = {
  id: string;
  name: string;
  is_active?: boolean;
};

type AssignmentRow = {
  user_id: string;
  role_id: string;
};

export default async function UsersPage() {
  const session = await createAuthService().requireSession();

  if (!session.roles.includes("admin")) {
    redirect("/activities");
  }

  const admin = createSupabaseAdminClient();
  const [{ data: users }, tenantsResult, { data: assignments }] = await Promise.all([
    admin
      .from("users")
      .select("id, tenant_id, email, full_name, is_active, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin.from("tenants").select("id, name, is_active").is("deleted_at", null),
    admin.from("user_role_assignments").select("user_id, role_id")
  ]);
  let tenants = tenantsResult.data as TenantRow[] | null;

  if (tenantsResult.error?.code === "42703") {
    const fallback = await admin.from("tenants").select("id, name").is("deleted_at", null);
    tenants = fallback.data as TenantRow[] | null;
  } else if (tenantsResult.error) {
    throw tenantsResult.error;
  }

  const tenantById = new Map((tenants as TenantRow[] | null)?.map((tenant) => [tenant.id, tenant]));
  const roleByUserId = new Map(
    (assignments as AssignmentRow[] | null)?.map((assignment) => [
      assignment.user_id,
      assignment.role_id as Role
    ])
  );
  const tableUsers: UsersTableRow[] = ((users as UserRow[] | null) || []).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    company: tenantById.get(user.tenant_id)?.name || "Unknown tenant",
    companyIsActive: tenantById.get(user.tenant_id)?.is_active ?? true,
    isActive: user.is_active,
    role: roleByUserId.get(user.id) || "promoter"
  }));

  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Users</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Invite users and manage platform roles across tenants.
          </p>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Invite user</h2>
        <form action={inviteUserFromPage} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-700"
            name="fullName"
            placeholder="Full name"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-700"
            name="email"
            placeholder="Email"
            required
            type="email"
          />
          <input
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-cyan-700"
            name="company"
            placeholder="Company"
            required
          />
          <FormSubmitButton
            className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-cyan-950"
            loadingLabel="Sending..."
            type="submit"
          >
            Send invite
          </FormSubmitButton>
        </form>
      </section>

      <UsersTable currentUserId={session.user.id} users={tableUsers} />
    </main>
  );
}
