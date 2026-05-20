import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { signOut } from "@/features/auth/server/auth-actions";
import { MobileShellNav } from "@/features/navigation/components/MobileShellNav";
import { MobilePageHeader } from "@/features/navigation/components/MobilePageHeader";
import { adminNav, managerNav, primaryNav, ShellNav } from "@/features/navigation/components/ShellNav";
import { FormSubmitButton } from "@/shared/loading";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await createAuthService().getSession();

  if (!session) {
    redirect("/login");
  }

  const displayName = session.user.fullName || "Field Promoter";
  const isAdmin = session.roles.includes("admin");
  const isManager = session.roles.includes("manager");
  const navItems = isAdmin ? adminNav : isManager ? managerNav : primaryNav;

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#eef3fb_0%,#f7f9fc_38%,#f4f6fb_100%)] text-slate-950">
      <div className="grid min-h-dvh lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200/80 bg-white/88 px-6 py-7 backdrop-blur lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-900 text-sm font-black text-white shadow-[0_12px_30px_-18px_rgba(8,47,73,0.8)]">
              PP
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-slate-950">Promoter Pulse</p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Field Operations</p>
            </div>
          </div>

          <ShellNav items={navItems} />

          <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Need support?</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Reach your manager if location access or check-in status is blocked.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="hidden border-b border-slate-200/80 bg-white/76 backdrop-blur lg:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 lg:hidden">
                  Promoter Pulse
                </p>
                <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                  {displayName}
                </h2>
                <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-500">
                  {session.roles[0] || "Promoter"} • {session.user.email}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
                  type="button"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>

                <form action={signOut}>
                  <FormSubmitButton
                    className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    loadingLabel="..."
                    title="Sign out"
                    type="submit"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M16 17 21 12 16 7M21 12H9m4 8v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </FormSubmitButton>
                </form>
              </div>
            </div>
          </header>

          <MobilePageHeader />

          <div className="mx-auto max-w-7xl px-4 py-5 pb-36 sm:px-6 lg:px-10 lg:py-6 lg:pb-6">{children}</div>
        </div>
      </div>
      <MobileShellNav
        isAdmin={isAdmin}
        isManager={isManager}
        roleLabel={session.roles[0] || "Promoter"}
        userEmail={session.user.email}
        userName={displayName}
      />
    </div>
  );
}
