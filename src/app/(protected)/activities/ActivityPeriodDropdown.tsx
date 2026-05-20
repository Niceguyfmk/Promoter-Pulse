"use client";

import { useRouter } from "next/navigation";
import type { ActivitySummaryPeriod } from "@/features/attendance/server/attendance-service";
import { useLoading } from "@/shared/loading";

export function ActivityPeriodDropdown({ currentPeriod }: { currentPeriod: ActivitySummaryPeriod }) {
  const router = useRouter();
  const { startRouteTransition } = useLoading();

  return (
    <div className="activity-feed">
      <select
        className="h-14 min-w-[220px] rounded-2xl bg-slate-800 pl-6 text-base font-semibold text-white shadow-lg shadow-slate-900/10 outline-none"
        defaultValue={currentPeriod}
        onChange={(event) => {
          startRouteTransition("Loading activities");
          router.push(`/activities?period=${event.target.value}`);
        }}
      >
        <option value="day">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
      </select>
    </div>
  );
}
