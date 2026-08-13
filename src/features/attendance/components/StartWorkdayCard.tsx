"use client";

import { LoadingLink as Link } from "@/shared/loading";
import type { Route } from "next";
import { useEffect, useState } from "react";
import type { ActiveWorkflowVisit } from "@/features/attendance/server/attendance-service";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function StartWorkdayCard({
  activeWorkflow
}: {
  activeWorkflow: ActiveWorkflowVisit | null;
}) {
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeWorkflow?.started_at) {
      return;
    }

    const startedAt = new Date(activeWorkflow.started_at).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeWorkflow?.started_at]);

  return (
    <>
      <section className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border border-border bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+4.7rem)] shadow-[0_-18px_45px_-30px_rgba(15,23,42,0.45)] lg:static lg:rounded-2xl lg:p-4 lg:pb-4 lg:shadow-sm xl:p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-base font-medium text-text sm:text-xl">Good morning!</h1>
            {!activeWorkflow ? (
              <button
                className="inline-flex h-14 shrink-0 items-center justify-center gap-3 rounded-lg bg-garnet px-5 text-sm font-bold text-white shadow-sm transition hover:bg-garnet-dark"
                onClick={() => setOpen(true)}
                type="button"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
                  <path
                    d="M12 8v5l3 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                Start workday
              </button>
            ) : null}
          </div>

          {activeWorkflow ? (
            <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {activeWorkflow.retail_stores?.name || "Current location"}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-text">
                  {formatDuration(elapsed)}
                </p>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-bold text-white transition hover:bg-ink-2"
                href={`/places/${activeWorkflow.store_id}` as Route}
              >
                Check out
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="px-6 py-6">
              <h2 className="text-xl font-medium text-text">Start your day?</h2>
            </div>
            <div className="grid grid-cols-2 border-t border-border">
              <button
                className="h-14 text-sm font-bold uppercase text-garnet transition hover:bg-surface"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <Link
                className="flex h-14 items-center justify-center border-l border-border text-sm font-bold uppercase text-garnet transition hover:bg-surface"
                href="/places?workflow=start"
              >
                Start day
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
