"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PromoterTabs() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "shifts";

  const tabs = [
    { id: "shifts", label: "My Shifts", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "places", label: "Places", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" }
  ];

  return (
    <div className="mb-6 flex space-x-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={{ pathname: "/activities", query: { tab: tab.id } }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
              isActive
                ? "bg-white text-cyan-900 shadow-sm"
                : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
