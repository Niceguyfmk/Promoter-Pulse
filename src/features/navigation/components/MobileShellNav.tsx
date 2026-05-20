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
  isManager: boolean;
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
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M8 4h8m-9 4h10M8 12h8m-8 4h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    )
  },
  {
    label: "Places",
    href: "/places",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    )
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M8 2v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    )
  }
];

function matchesPath(pathname: string, href: Route) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileShellNav({
  userName,
  userEmail,
  roleLabel,
  isAdmin,
  isManager
}: MobileShellNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = getInitials(userName, userEmail);
  const canManageTemplates = isAdmin || isManager;

  return (
    <>
      {menuOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}

      {menuOpen ? (
        <section className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.8rem)] z-50 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_-28px_rgba(15,23,42,0.5)] lg:hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-500 text-base font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{userName}</p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
              {roleLabel}
            </p>
          </div>

          <div className="grid gap-2 p-3">
            <MenuLink href="/reports" label="Reports" onClick={() => setMenuOpen(false)} />
            {canManageTemplates ? (
              <MenuLink
                href={"/templates/forms" as Route}
                label="Templates"
                onClick={() => setMenuOpen(false)}
              />
            ) : null}
            {isAdmin ? (
              <MenuLink href={"/companies" as Route} label="Companies" onClick={() => setMenuOpen(false)} />
            ) : null}
            {isAdmin ? (
              <MenuLink href={"/users" as Route} label="Users" onClick={() => setMenuOpen(false)} />
            ) : null}
            <button
              className="flex min-h-12 items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              type="button"
            >
              <span>Profile settings</span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Soon</span>
            </button>
            <form action={signOut}>
              <FormSubmitButton
                className="mt-1 flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white"
                loadingLabel="Signing out..."
                type="submit"
              >
                Sign out
              </FormSubmitButton>
            </form>
          </div>
        </section>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 gap-1 border-t border-slate-200 bg-white/98 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 shadow-[0_-18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
        {primaryItems.map((item) => {
          const active = matchesPath(pathname, item.href);

          return (
            <LoadingLink
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center"
              href={item.href}
              key={item.label}
              onClick={() => setMenuOpen(false)}
            >
              <span className={["grid h-9 w-9 place-items-center", active ? "text-teal-600" : "text-slate-600"].join(" ")}>
                {item.icon}
              </span>
              <span className={["text-[12px] font-semibold", active ? "text-slate-900" : "text-slate-600"].join(" ")}>
                {item.label}
              </span>
            </LoadingLink>
          );
        })}

        <button
          className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span
            className={[
              "relative grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white transition",
              menuOpen ? "bg-slate-950" : "bg-red-500"
            ].join(" ")}
          >
            {initials}
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-teal-500" />
          </span>
          <span className={["text-[12px] font-semibold", menuOpen ? "text-slate-900" : "text-slate-600"].join(" ")}>
            Menu
          </span>
        </button>
      </nav>
    </>
  );
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source
    .replace(/@.*$/, "")
    .split(/\s|[._-]/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "PP";
}

function MenuLink({
  href,
  label,
  onClick
}: {
  href: Route;
  label: string;
  onClick: () => void;
}) {
  return (
    <LoadingLink
      className="flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
      href={href}
      onClick={onClick}
    >
      <span>{label}</span>
      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </LoadingLink>
  );
}
