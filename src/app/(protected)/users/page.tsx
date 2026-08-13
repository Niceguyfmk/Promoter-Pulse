import { redirect } from "next/navigation";
import { Suspense } from "react";

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

  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">Users</h1>
          <p className="mt-2 text-sm leading-6 text-text-2">
            Invite users and manage platform roles across tenants.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-text">Invite user</h2>
        <form
          action={inviteUserFromPage}
          className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <input
            className="min-h-12 rounded-2xl border border-border bg-card px-4 text-sm outline-none transition focus:border-garnet"
            name="fullName"
            placeholder="Full name"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-border bg-card px-4 text-sm outline-none transition focus:border-garnet"
            name="email"
            placeholder="Email"
            required
            type="email"
          />
          <input
            className="min-h-12 rounded-2xl border border-border bg-card px-4 text-sm outline-none transition focus:border-garnet"
            name="company"
            placeholder="Company"
            required
          />
          <FormSubmitButton
            className="min-h-12 rounded-2xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-2"
            loadingLabel="Sending..."
            type="submit"
          >
            Send invite
          </FormSubmitButton>
        </form>
      </section>

      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersSection currentUserId={session.user.id} />
      </Suspense>
    </main>
  );
}

async function UsersSection({ currentUserId }: { currentUserId: string }) {
  const admin = createSupabaseAdminClient();
  // Primary list is capped since it's a direct, truncatable listing; the
  // tenant/role lookups below stay unbounded since they're keyed by id and
  // capping them could silently mislabel a displayed user's company/role.
  const [{ data: users }, tenantsResult, { data: assignments }] = await Promise.all([
    admin
      .from("users")
      .select("id, tenant_id, email, full_name, is_active, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
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

  return <UsersTable currentUserId={currentUserId} users={tableUsers} />;
}

function UsersTableSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="h-11 bg-surface" />
      {Array.from({ length: 6 }).map((_, row) => (
        <div className="flex gap-4 border-t border-border px-5 py-4" key={row}>
          {Array.from({ length: 5 }).map((_, col) => (
            <div className="h-4 flex-1 rounded bg-surface" key={col} />
          ))}
        </div>
      ))}
    </div>
  );
}
