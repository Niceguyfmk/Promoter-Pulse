"use client";

import { usePathname } from "next/navigation";

const titles: Array<{ prefix: string; title: string }> = [
  { prefix: "/activities", title: "Activities" },
  { prefix: "/places", title: "Places" },
  { prefix: "/schedule", title: "Schedule" },
  { prefix: "/reports", title: "Reports" },
  { prefix: "/templates", title: "Templates" },
  { prefix: "/companies", title: "Companies" },
  { prefix: "/users", title: "Users" }
];

export function MobilePageHeader() {
  const pathname = usePathname();
  const title = titles.find((item) => pathname.startsWith(item.prefix))?.title ?? "Promoter Pulse";

  return (
    <header className="sticky top-0 z-30 border-b border-teal-700/20 bg-teal-500 text-white shadow-sm lg:hidden">
      <div className="flex h-[72px] items-center justify-between px-5">
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        <button
          aria-label="Filter"
          className="grid h-11 w-11 place-items-center rounded-full text-white transition hover:bg-white/10"
          type="button"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4 5h16l-6.5 7.5V19l-3 1.5v-8L4 5Z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
