"use client";

import { useMemo, useState } from "react";

import { SurveyPreview } from "./SurveyPreview";
import { parseSurveySchemaText, surveySchemaText } from "../lib/survey-schema";
import type { Json } from "@/shared/supabase/database.types";

const EMPTY_SURVEY_SCHEMA = {
  title: "New Form",
  description: "Build this form in the SurveyJS browser editor, then paste the JSON here.",
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "text",
          name: "exampleField",
          title: "Example field"
        }
      ]
    }
  ]
} satisfies Json;

export function SurveyFormEditor({
  action,
  initialValue
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValue?: {
    description?: string | null;
    id?: string;
    isActive?: boolean;
    name?: string;
    schemaJson?: Json;
  };
}) {
  const [schemaText, setSchemaText] = useState(
    surveySchemaText(initialValue?.schemaJson ?? EMPTY_SURVEY_SCHEMA)
  );

  const previewState = useMemo(() => {
    try {
      const schema = parseSurveySchemaText(schemaText);
      return { schema, error: null as string | null };
    } catch (error) {
      return {
        schema: null,
        error: error instanceof Error ? error.message : "Invalid schema"
      };
    }
  }, [schemaText]);

  return (
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form action={action} className="space-y-5">
        {initialValue?.id ? <input name="formId" type="hidden" value={initialValue.id} /> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Form name</span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              defaultValue={initialValue?.name ?? ""}
              name="name"
              placeholder="Retail visit checklist"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Status</span>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              defaultValue={String(initialValue?.isActive ?? true)}
              name="isActive"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-800">Description</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
            defaultValue={initialValue?.description ?? ""}
            name="description"
            placeholder="What this form is for and when promoters should use it."
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-800">SurveyJS JSON</span>
          <textarea
            className="mt-2 min-h-[420px] w-full rounded-2xl border border-slate-300 bg-slate-950 px-4 py-4 font-mono text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            name="schemaJson"
            onChange={(event) => setSchemaText(event.target.value)}
            spellCheck={false}
            value={schemaText}
          />
        </label>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>Create or edit the form in SurveyJS Creator, then paste the JSON here.</span>
          <a
            className="font-semibold text-cyan-800 underline underline-offset-4"
            href="https://surveyjs.io/create-free-survey"
            rel="noreferrer"
            target="_blank"
          >
            Open SurveyJS Creator
          </a>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="submit"
          >
            {initialValue?.id ? "Save form" : "Create form"}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Preview</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Rendered form</h2>
          </div>

          {previewState.schema ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
              <SurveyPreview readOnly={false} schema={previewState.schema} />
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {previewState.error || "Invalid schema"}
            </div>
          )}
      </div>
    </section>
  );
}
