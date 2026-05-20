"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import type { Json } from "@/shared/supabase/database.types";
import type { VisitReportRow } from "@/features/attendance/server/visit-report-service";
import { saveVisitReportAction } from "@/features/attendance/server/visit-report-actions";
import { AssignedSurveyForm, type AssignedFormOption } from "@/features/forms/components/AssignedSurveyForm";

type Store = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
};

function asRecord(value: Json): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function RemoteVisitWorkspace({
  assignedForms,
  report,
  store
}: {
  assignedForms: AssignedFormOption[];
  report: VisitReportRow;
  store: Store;
}) {
  const visitFormId = "visit-report-form";
  const formAnswers = useMemo(() => asRecord(report.form_answers), [report.form_answers]);
  const hasSavedForm = Boolean(report.form_id && Object.keys(formAnswers).length > 0);
  
  const initialFormId = report.form_id ?? assignedForms[0]?.id ?? "";
  const initialFormName = assignedForms.find(f => f.id === initialFormId)?.name ?? "";

  const [currentAnswers, setCurrentAnswers] = useState<Record<string, Json>>(formAnswers);
  const [currentFormId, setCurrentFormId] = useState(initialFormId);
  const [currentFormName, setCurrentFormName] = useState(initialFormName);

  const handleFormChange = (formId: string, formName: string, answers: Record<string, Json>) => {
    setCurrentFormId(formId);
    setCurrentFormName(formName);
    setCurrentAnswers(answers);
  };

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

      <form action={saveVisitReportAction} className="hidden" id={visitFormId}>
        <input name="reportId" type="hidden" value={report.id} />
        <input name="storeId" type="hidden" value={store.id} />
        <input name="formAnswersJson" type="hidden" value={JSON.stringify(currentAnswers)} />
        <input name="formId" type="hidden" value={currentFormId} />
        <input name="formName" type="hidden" value={currentFormName} />
      </form>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-7">
            <AssignedSurveyForm
              forms={assignedForms}
              formId={visitFormId}
              initialAnswers={formAnswers}
              initialFormId={report.form_id}
              reportId={report.id}
              storeId={store.id}
              onChange={handleFormChange}
            />
          </div>
        </section>

        <aside className="space-y-4">
          <VisitTimer checkedOutAt={report.checked_out_at} startedAt={report.started_at} storeName={store.name} />

          <button
            className="h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            form={visitFormId}
            name="intent"
            type="submit"
            value="save"
          >
            Save progress
          </button>
          <button
            className={`h-12 w-full rounded-xl px-4 text-sm font-bold text-white shadow-sm transition ${hasSavedForm ? "bg-red-500 hover:bg-red-600" : "bg-red-300 cursor-not-allowed"}`}
            disabled={!hasSavedForm}
            form={visitFormId}
            name="intent"
            type="submit"
            value="submit"
          >
            {hasSavedForm ? "Check out & submit" : "Save a form first"}
          </button>
        </aside>
      </div>
    </main>
  );
}

function VisitTimer({
  checkedOutAt,
  startedAt,
  storeName
}: {
  checkedOutAt: string | null;
  startedAt: string;
  storeName: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const end = checkedOutAt ? new Date(checkedOutAt).getTime() : null;
    const update = () => {
      const endTime = end ?? Date.now();
      setElapsed(Math.max(0, Math.floor((endTime - start) / 1000)));
    };

    update();
    if (checkedOutAt) {
      return;
    }

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [checkedOutAt, startedAt]);

  return (
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
        {checkedOutAt ? "Checked out from" : "Checked in at"}{" "}
        <span className="font-semibold text-slate-700">{storeName}</span>
      </p>
    </section>
  );
}

