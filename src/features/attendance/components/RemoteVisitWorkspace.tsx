"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import type { Json } from "@/shared/supabase/database.types";
import type {
  VisitReportRow,
  VisitReportVoiceNoteItem
} from "@/features/attendance/server/visit-report-service";
import { saveVisitReportAction } from "@/features/attendance/server/visit-report-actions";
import {
  AssignedSurveyForm,
  type AssignedFormOption
} from "@/features/forms/components/AssignedSurveyForm";
import { VoiceNoteRecorder } from "@/features/attendance/components/VoiceNoteRecorder";
import { ButtonLoader, LoadingLink } from "@/shared/loading";

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
  store,
  voiceNotes
}: {
  assignedForms: AssignedFormOption[];
  report: VisitReportRow;
  store: Store;
  voiceNotes: VisitReportVoiceNoteItem[];
}) {
  const visitFormId = "visit-report-form";
  const formAnswers = useMemo(() => asRecord(report.form_answers), [report.form_answers]);
  const hasSavedForm = Boolean(report.form_id && Object.keys(formAnswers).length > 0);

  const initialFormId = report.form_id ?? assignedForms[0]?.id ?? "";
  const initialFormName = assignedForms.find((f) => f.id === initialFormId)?.name ?? "";

  const [currentAnswers, setCurrentAnswers] = useState<Record<string, Json>>(formAnswers);
  const [currentFormId, setCurrentFormId] = useState(initialFormId);
  const [currentFormName, setCurrentFormName] = useState(initialFormName);
  const [pendingIntent, setPendingIntent] = useState<"save" | "submit" | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const selectedForm = assignedForms.find((form) => form.id === currentFormId) ?? assignedForms[0];
  const formSummary = useMemo(() => getFormSummary(selectedForm?.schema_json), [selectedForm]);
  const answeredRequired = formSummary.requiredNames.filter((name) =>
    hasAnswer(currentAnswers[name])
  ).length;

  // Reset the pending indicator once a fresh `report` prop lands after a save
  // action revalidates (saveVisitReportAction doesn't redirect on plain saves).
  const [prevReport, setPrevReport] = useState(report);
  if (report !== prevReport) {
    setPrevReport(report);
    setPendingIntent(null);
  }

  const handleFormChange = useCallback(
    (formId: string, formName: string, answers: Record<string, Json>) => {
      setCurrentFormId(formId);
      setCurrentFormName(formName);
      setCurrentAnswers(answers);
    },
    []
  );

  return (
    <main className="mx-auto max-w-6xl space-y-5 pb-28">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative min-h-[210px] bg-[linear-gradient(rgba(20,22,26,0.75),rgba(20,22,26,0.55)),url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center">
          <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
            <LoadingLink
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
              href="/places"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M15 18 9 12l6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </LoadingLink>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brass">
                Remote check-in
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-4xl">{store.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85">
                {[store.address, store.city, store.country].filter(Boolean).join(", ") ||
                  "No address provided"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-ink-3 bg-ink text-white">
          <button className="h-14 text-xs font-bold uppercase" type="button">
            Schedule
          </button>
          <button
            className="h-14 border-x border-white/15 text-xs font-bold uppercase"
            type="button"
          >
            Contact
          </button>
          <button className="h-14 text-xs font-bold uppercase" type="button">
            Files
          </button>
        </div>

        <div className="p-5 text-center sm:p-8">
          <p className="text-sm text-text-2">
            {report.checked_out_at ? "This visit has been checked out." : "You are now checked in."}
          </p>
          <p className="mt-2 text-sm font-bold text-text">
            Record a voice note, fill your form, and document your work.
          </p>
          {report.status === "rejected" && report.review_note ? (
            <p className="mx-auto mt-4 max-w-2xl rounded-lg bg-danger-tint p-4 text-sm leading-6 text-danger">
              {report.review_note}
            </p>
          ) : null}
        </div>
      </section>

      <form
        action={saveVisitReportAction}
        className="hidden"
        id={visitFormId}
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          setPendingIntent(submitter?.value === "submit" ? "submit" : "save");
        }}
      >
        <input name="reportId" type="hidden" value={report.id} />
        <input name="storeId" type="hidden" value={store.id} />
        <input name="formAnswersJson" type="hidden" value={JSON.stringify(currentAnswers)} />
        <input name="formId" type="hidden" value={currentFormId} />
        <input name="formName" type="hidden" value={currentFormName} />
      </form>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <VoiceNoteRecorder initialNotes={voiceNotes} reportId={report.id} storeId={store.id} />

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            {selectedForm ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-text">
                      <FormIcon />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-2">
                        Assigned form
                      </p>
                      <h2 className="truncate text-lg font-bold text-text">{selectedForm.name}</h2>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-bold text-text-2">
                    {Object.keys(currentAnswers).length > 0
                      ? `Draft · ${answeredRequired} of ${formSummary.requiredNames.length} required`
                      : "Not started"}
                  </span>
                </div>
                <p className="mt-5 text-sm leading-6 text-text-2">
                  {formSummary.total} fields · {formSummary.requiredNames.length} required
                  {selectedForm.description ? ` · ${selectedForm.description}` : ""}
                </p>
                <button
                  className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-ink text-sm font-bold text-white transition hover:bg-ink-2"
                  onClick={() => setFormOpen(true)}
                  type="button"
                >
                  {Object.keys(currentAnswers).length > 0 ? "Continue form" : "Open form"}
                  <span aria-hidden="true" className="text-xl">
                    ›
                  </span>
                </button>
              </>
            ) : (
              <div className="rounded-xl bg-warning-tint p-4 text-sm leading-6 text-warning">
                No form is assigned to this place yet.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <VisitTimer
            checkedOutAt={report.checked_out_at}
            startedAt={report.started_at}
            storeName={store.name}
          />

          <button
            className="h-12 w-full rounded-lg bg-surface px-4 text-sm font-bold text-text transition hover:bg-border"
            form={visitFormId}
            name="intent"
            type="submit"
            value="save"
            disabled={pendingIntent !== null}
          >
            <ButtonLoader
              label="Save progress"
              loading={pendingIntent === "save"}
              loadingLabel="Saving..."
            />
          </button>
          <button
            className={`h-12 w-full rounded-lg px-4 text-sm font-bold text-white shadow-sm transition ${hasSavedForm ? "bg-danger hover:bg-danger/90" : "bg-danger/40 cursor-not-allowed"}`}
            disabled={!hasSavedForm || pendingIntent !== null}
            form={visitFormId}
            name="intent"
            type="submit"
            value="submit"
          >
            <ButtonLoader
              label={hasSavedForm ? "Check out & submit" : "Save a form first"}
              loading={pendingIntent === "submit"}
              loadingLabel="Submitting..."
            />
          </button>
        </aside>
      </div>

      <div
        aria-hidden={!formOpen}
        className={[
          "fixed inset-0 z-[70] bg-card transition",
          formOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        ].join(" ")}
      >
        <div className="flex h-dvh flex-col">
          <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 bg-ink px-5 text-white sm:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                aria-label="Close form"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-white/10"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
              <h2 className="truncate text-xl font-bold">{currentFormName || "Assigned form"}</h2>
            </div>
            <span className="text-sm text-white/75">Visit form</span>
          </header>
          <div className="h-1 shrink-0 bg-border">
            <div className="h-full w-1/2 bg-garnet" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-card">
            <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8">
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
          </div>

          <footer className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-8">
            <div className="mx-auto flex max-w-3xl gap-3">
              <button
                className="h-12 flex-1 rounded-xl border border-border bg-card text-sm font-bold text-text transition hover:bg-surface"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                Close
              </button>
              <button
                className="h-12 flex-1 rounded-xl bg-garnet text-sm font-bold text-white transition hover:bg-garnet-dark disabled:opacity-60"
                disabled={pendingIntent !== null}
                form={visitFormId}
                name="intent"
                onClick={() => setFormOpen(false)}
                type="submit"
                value="save"
              >
                <ButtonLoader
                  label="Save & close"
                  loading={pendingIntent === "save"}
                  loadingLabel="Saving..."
                />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

function getFormSummary(schema: Json | undefined) {
  const fields: Array<{ name: string; required: boolean }> = [];

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.name === "string" && typeof record.type === "string") {
      fields.push({ name: record.name, required: record.isRequired === true });
    }
    Object.values(record).forEach(visit);
  }

  visit(schema);
  return {
    requiredNames: fields.filter((field) => field.required).map((field) => field.name),
    total: fields.length
  };
}

function hasAnswer(value: Json | undefined) {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function FormIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="18" rx="2" strokeWidth="1.8" width="14" x="5" y="3" />
      <path d="M9 8h6m-6 4h6m-6 4h4" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeWidth="2" />
    </svg>
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
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-2">Current visit</p>
      <div className="mt-4 flex items-center gap-3 text-text">
        <svg className="h-5 w-5 text-text-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
          <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
        <span className="font-mono text-lg">{formatDuration(elapsed)}</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-2">
        {checkedOutAt ? "Checked out from" : "Checked in at"}{" "}
        <span className="font-semibold text-text">{storeName}</span>
      </p>
    </section>
  );
}
