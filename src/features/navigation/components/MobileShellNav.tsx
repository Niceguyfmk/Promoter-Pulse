"use client";

import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/features/auth/server/auth-actions";
import { FormSubmitButton, LoadingLink } from "@/shared/loading";

type MobileShellNavProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
  isAdmin: boolean;
};

type PrimaryItem = {
  label: string;
  href: Route;
  icon: React.ReactNode;
};

const primaryItems: PrimaryItem[] = [
  {
    label: "Activities",
    href: "/activities",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M7 3v3m10-3v3M5 8h14M6 5h12a1 1 0 0 1 1 1v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M9 12h6M9 16h4" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    label: "Places",
    href: "/places",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="10" r="2.5" strokeWidth="1.8" />
      </svg>
    )
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }
];

function matchesPath(pathname: string, href: Route) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileShellNav({ userName, userEmail, roleLabel, isAdmin }: MobileShellNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {menuOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div
        className={[
          "fixed inset-x-0 bottom-0 z-50 rounded-t-[30px] border-t border-slate-200 bg-white/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden",
          menuOpen ? "translate-y-0" : "translate-y-[calc(100%-6.25rem)]",
          "transition-transform duration-300"
        ].join(" ")}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">{userName}</p>
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {roleLabel} • {userEmail}
            </p>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div className="mb-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <MenuLink href="/reports" label="Reports" />
            {isAdmin ? <MenuLink href={"/templates/forms" as Route} label="Templates" /> : null}
            {isAdmin ? <MenuLink href={"/companies" as Route} label="Companies" /> : null}
            {isAdmin ? <MenuLink href={"/users" as Route} label="Users" /> : null}
            <MenuLink href="/places" label="Places" />
            <button
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm"
              type="button"
            >
              <span>Help</span>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Support</span>
            </button>
            <form action={signOut}>
              <FormSubmitButton
                className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                loadingLabel="Signing out..."
                type="submit"
              >
                Sign out
              </FormSubmitButton>
            </form>
          </div>
        ) : null}

        <nav className="grid grid-cols-4 gap-2">
          {primaryItems.map((item) => {
            const active = matchesPath(pathname, item.href);

            return (
              <LoadingLink
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center"
                href={item.href}
                key={item.label}
                onClick={() => setMenuOpen(false)}
              >
                <span
                  className={[
                    "grid h-10 w-10 place-items-center rounded-2xl transition",
                    active ? "bg-cyan-50 text-cyan-800" : "bg-slate-100 text-slate-500"
                  ].join(" ")}
                >
                  {item.icon}
                </span>
                <span
                  className={[
                    "text-[11px] font-semibold",
                    active ? "text-cyan-900" : "text-slate-500"
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </LoadingLink>
            );
          })}

          <button
            className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span
              className={[
                "grid h-10 w-10 place-items-center rounded-2xl transition",
                menuOpen ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
              ].join(" ")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Menu</span>
          </button>
        </nav>
      </div>
    </>
  );
}

function MenuLink({ href, label }: { href: Route; label: string }) {
  return (
    <LoadingLink
      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
      href={href}
    >
      <span>{label}</span>
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </LoadingLink>
  );
}
