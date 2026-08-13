"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LoadingLink } from "@/shared/loading";

export type NavItem = {
  children?: Array<{ href: Route; label: string }>;
  label: string;
  href: string;
  icon: ReactNode;
};

export const primaryNav: NavItem[] = [
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
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 111.314 0z M15 11a3 3 0 1 1-6 0 3 3 0 016 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
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
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M7 18V9m5 9V6m5 12v-4M4 20h16"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }
];

export const adminNav: NavItem[] = [
  ...primaryNav,
  {
    label: "Templates",
    href: "/templates",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M7 7h10M7 12h7m-7 5h10M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
    children: [{ label: "Forms", href: "/templates/forms" as Route }]
  },
  {
    label: "Companies",
    href: "/companies",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M8 7h4M8 11h4M8 15h4M16 9h2a2 2 0 0 1 2 2v10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  },
  {
    label: "Users",
    href: "/users",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19m8-11.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm8 11.5v-1a3 3 0 0 0-2-2.83m-1-10.84a3 3 0 0 1 0 5.34"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }
];

export const managerNav: NavItem[] = adminNav.filter(
  (item) => item.label !== "Companies" && item.label !== "Users"
);

export function ShellNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const childActive =
          item.children?.some((child) => pathname.startsWith(child.href)) ?? false;
        const active = pathname.startsWith(item.href) || childActive;
        const hasChildren = Boolean(item.children?.length);

        return (
          <div className="group relative" key={item.label}>
            {hasChildren ? (
              <div
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                  active
                    ? "bg-garnet-tint text-garnet"
                    : "text-text-2 hover:bg-surface hover:text-text"
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-garnet/25 bg-card text-garnet shadow-sm"
                      : "border-transparent bg-surface text-text-2 group-hover:border-border group-hover:bg-card group-hover:text-text"
                  ].join(" ")}
                >
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                <svg
                  className={[
                    "h-4 w-4 transition-transform group-hover:rotate-180",
                    childActive ? "rotate-180" : ""
                  ].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m9 6 6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            ) : (
              <LoadingLink
                className={[
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                  active
                    ? "bg-garnet-tint text-garnet"
                    : "text-text-2 hover:bg-surface hover:text-text"
                ].join(" ")}
                href={item.href as Route}
              >
                <span
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-garnet/25 bg-card text-garnet shadow-sm"
                      : "border-transparent bg-surface text-text-2 group-hover:border-border group-hover:bg-card group-hover:text-text"
                  ].join(" ")}
                >
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {active ? <div className="h-1.5 w-1.5 rounded-full bg-garnet" /> : null}
              </LoadingLink>
            )}

            {hasChildren ? (
              <div className="invisible absolute left-full top-0 z-30 ml-3 min-w-[200px] translate-x-2 rounded-xl border border-border bg-card p-2 opacity-0 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] transition-all group-hover:visible group-hover:translate-x-0 group-hover:opacity-100">
                {item.children?.map((child) => (
                  <LoadingLink
                    className={[
                      "block rounded-lg px-4 py-3 text-sm font-medium transition",
                      pathname.startsWith(child.href)
                        ? "bg-garnet-tint text-garnet"
                        : "text-text hover:bg-surface"
                    ].join(" ")}
                    href={child.href}
                    key={child.label}
                  >
                    {child.label}
                  </LoadingLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
