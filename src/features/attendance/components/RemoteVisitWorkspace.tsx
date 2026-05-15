"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Json } from "@/shared/supabase/database.types";
import type { VisitReportRow } from "@/features/attendance/server/visit-report-service";
import { saveVisitReportAction } from "@/features/attendance/server/visit-report-actions";

type Store = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
};

function asRecord(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : ""])
  );
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function RemoteVisitWorkspace({ report, store }: { report: VisitReportRow; store: Store }) {
  const [elapsed, setElapsed] = useState(0);
  const [activePanel, setActivePanel] = useState<"form" | "photos" | "note">("form");
  const formAnswers = useMemo(() => asRecord(report.form_answers), [report.form_answers]);
  const salesNumbers = useMemo(() => asRecord(report.sales_numbers), [report.sales_numbers]);
  const merchandising = useMemo(() => asRecord(report.merchandising), [report.merchandising]);
  const hasSubmittedPhotos = Array.isArray(report.photo_items) && report.photo_items.length > 0;

  useEffect(() => {
    const startedAt = new Date(report.started_at).getTime();
    const checkedOutAt = report.checked_out_at ? new Date(report.checked_out_at).getTime() : null;
    const update = () => {
      const endTime = checkedOutAt ?? Date.now();
      setElapsed(Math.max(0, Math.floor((endTime - startedAt) / 1000)));
    };

    update();
    if (checkedOutAt) {
      return;
    }

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [report.checked_out_at, report.started_at]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 pb-28">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative min-h-[210px] bg-[linear-gradient(rgba(15,23,42,0.58),rgba(15,23,42,0.5)),url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
            <Link className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur" href="/places">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 18 9 12l6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Remote check-in</p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-4xl">{store.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                {[store.address, store.city, store.country].filter(Boolean).join(", ") || "No address provided"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-teal-500 bg-teal-500 text-white">
          <button className="h-14 text-xs font-bold uppercase" type="button">Schedule</button>
          <button className="h-14 border-x border-white/30 text-xs font-bold uppercase" type="button">Contact</button>
          <button className="h-14 text-xs font-bold uppercase" type="button">Files</button>
        </div>

        <div className="p-5 text-center sm:p-8">
          <p className="text-sm text-slate-400">
            {report.checked_out_at ? "This visit has been checked out." : "You are now checked in."}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-700">Add photos, fill a form, and document your work.</p>
          {report.status === "rejected" && report.review_note ? (
            <p className="mx-auto mt-4 max-w-2xl rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
              {report.review_note}
            </p>
          ) : null}
        </div>
      </section>

      <form action={saveVisitReportAction} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <input name="reportId" type="hidden" value={report.id} />
        <input name="storeId" type="hidden" value={store.id} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-slate-200">
            <PanelButton active={activePanel === "photos"} label="Photo" onClick={() => setActivePanel("photos")} tone="yellow" />
            <PanelButton active={activePanel === "form"} label="Form" onClick={() => setActivePanel("form")} tone="blue" />
            <PanelButton active={activePanel === "note"} label="Note" onClick={() => setActivePanel("note")} tone="slate" />
          </div>

          <div className="p-5 sm:p-7">
            <div className={activePanel === "form" ? "block" : "hidden"}>
              <DailyCheckInFields
                formAnswers={formAnswers}
                merchandising={merchandising}
                salesNumbers={salesNumbers}
              />
            </div>

            <div className={activePanel === "photos" ? "space-y-7" : "hidden"}>
                <FileField
                  label="Please take a selfie in-store"
                  name="selfiePhoto"
                  required={!hasSubmittedPhotos}
                />
                <FileField
                  label="Please take a photo of complete Display & Fixture"
                  name="displayPhoto"
                  required={!hasSubmittedPhotos}
                />
            </div>

            <div className={activePanel === "note" ? "block" : "hidden"}>
              <label className="block">
                <span className="text-sm font-bold text-slate-800">Visit note</span>
                <textarea
                  className="mt-3 min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  defaultValue={report.note || ""}
                  name="note"
                  placeholder="Add context for your manager..."
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Current visit</p>
            <div className="mt-4 flex items-center gap-3 text-slate-700">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
                <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
              <span className="font-mono text-lg">{formatDuration(elapsed)}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {report.checked_out_at ? "Checked out from" : "Checked in at"}{" "}
              <span className="font-semibold text-slate-700">{store.name}</span>
            </p>
          </section>

          <button
            className="h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            name="intent"
            type="submit"
            value="save"
          >
            Save progress
          </button>
          <button
            className="h-12 w-full rounded-xl bg-red-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
            name="intent"
            type="submit"
            value="submit"
          >
            Check out & submit
          </button>
        </aside>
      </form>
    </main>
  );
}

function PanelButton({
  active,
  label,
  onClick,
  tone
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone: "yellow" | "blue" | "slate";
}) {
  const tones = {
    yellow: "bg-amber-400 text-white",
    blue: "bg-sky-600 text-white",
    slate: "bg-slate-700 text-white"
  };

  return (
    <button
      className="flex min-h-20 flex-col items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? tones[tone] : "bg-slate-100 text-slate-500"}`}>
        {label.charAt(0)}
      </span>
      {label}
    </button>
  );
}

function DailyCheckInFields({
  formAnswers,
  merchandising,
  salesNumbers
}: {
  formAnswers: Record<string, string>;
  merchandising: Record<string, string>;
  salesNumbers: Record<string, string>;
}) {
  return (
    <div className="space-y-7">
      <div>
        <label className="text-sm font-bold text-slate-800" htmlFor="form-template">Form</label>
        <select
          className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          defaultValue="daily-check-in"
          id="form-template"
        >
          <option value="daily-check-in">Daily Check-in</option>
        </select>
      </div>
      <TextField defaultValue={formAnswers.interactions} label="Interactions" name="interactions" />
      <TextField defaultValue={formAnswers.demos} label="Demos" name="demos" />
      <TextField defaultValue={formAnswers.demosWithPhoto} label="Demos with Photo" name="demosWithPhoto" />
      <TextField defaultValue={salesNumbers.coreProducts} label="Daily Sales - Core Products" name="coreProducts" />
      <TextField defaultValue={salesNumbers.accessories} label="Daily Sales - Accessories" name="accessories" />
      <TextField defaultValue={merchandising.displayFixtureComplete} label="Merchandising / Display Compliance" name="displayFixtureComplete" placeholder="Enter display compliance notes" />
    </div>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  placeholder = "Enter an answer"
}: {
  defaultValue: string | undefined;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-bold text-slate-800">
        {label}
        <span className="text-red-500">*</span>
      </span>
      <input
        className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        defaultValue={defaultValue || ""}
        name={name}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function FileField({ label, name, required }: { label: string; name: string; required: boolean }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-bold text-slate-800">
        {label}
        <span className="text-red-500">*</span>
      </span>
      <input
        accept="image/*"
        capture="environment"
        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
        name={name}
        required={required}
        type="file"
      />
    </label>
  );
}
