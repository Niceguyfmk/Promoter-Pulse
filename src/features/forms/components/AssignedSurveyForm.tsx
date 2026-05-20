"use client";

import { useEffect, useRef, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { promoterPulseTheme } from "../lib/theme";

import type { Json } from "@/shared/supabase/database.types";
import { normalizeSurveyAnswers } from "../lib/survey-schema";
import { uploadSurveyFileAction } from "@/features/attendance/server/visit-report-actions";

export type AssignedFormOption = {
  description: string | null;
  id: string;
  name: string;
  schema_json: Json;
};

export function AssignedSurveyForm({
  forms,
  formId,
  initialAnswers,
  initialFormId,
  reportId,
  storeId,
  onChange
}: {
  forms: AssignedFormOption[];
  formId: string;
  initialAnswers: Record<string, Json>;
  initialFormId: string | null;
  reportId: string;
  storeId: string;
  onChange: (formId: string, formName: string, answers: Record<string, Json>) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(initialFormId ?? forms[0]?.id ?? "");
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<Model | null>(null);
  const lastSelectedFormIdRef = useRef<string | null>(null);

  const effectiveSelectedFormId =
    forms.find((form) => form.id === selectedFormId)?.id ?? forms[0]?.id ?? "";
  const selectedForm = forms.find((form) => form.id === effectiveSelectedFormId) ?? null;
  const surveyModel = modelRef.current;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedForm) {
      modelRef.current = null;
      lastSelectedFormIdRef.current = null;
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = "{}";
      }
      return;
    }

    if (lastSelectedFormIdRef.current !== selectedForm.id || !modelRef.current) {
      const nextModel = new Model(selectedForm.schema_json);
      nextModel.applyTheme(promoterPulseTheme);
      nextModel.showCompletedPage = false;
      nextModel.completeText = "Save form";
      nextModel.data = normalizeSurveyAnswers(initialAnswers);
      
      // When the user clicks the SurveyJS "Submit" button, prevent SurveyJS from hiding
      // the form and instead trigger the outer HTML form submission to SAVE progress.
      nextModel.onCompleting.add((sender, options) => {
        options.allowComplete = false;
        
        const submitBtn = document.querySelector(`button[form="${formId}"][value="save"]`) as HTMLButtonElement | null;
        if (submitBtn) {
          submitBtn.click();
        } else {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          if (form) {
            const hiddenIntent = document.createElement("input");
            hiddenIntent.type = "hidden";
            hiddenIntent.name = "intent";
            hiddenIntent.value = "save";
            form.appendChild(hiddenIntent);
            form.requestSubmit();
            hiddenIntent.remove();
          }
        }
      });
      
      // Wire up file uploads directly to the database storage
      nextModel.onUploadFiles.add((_, options) => {
        const promises = options.files.map(async (file) => {
          const formData = new FormData();
          formData.append("reportId", reportId);
          formData.append("storeId", storeId);
          formData.append("file", file);
          const result = await uploadSurveyFileAction(formData);
          return { file, content: result.content };
        });

        Promise.all(promises)
          .then((results) => {
            options.callback("success", results);
          })
          .catch((err) => {
            options.callback("error", err instanceof Error ? err.message : "Upload failed");
          });
      });

      modelRef.current = nextModel;
      lastSelectedFormIdRef.current = selectedForm.id;
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = JSON.stringify(nextModel.data ?? {});
      }
    }
  }, [initialAnswers, selectedForm]);

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const update = () => {
      onChange(effectiveSelectedFormId, selectedForm?.name ?? "", surveyModel.data ?? {});
    };

    update();

    surveyModel.onValueChanged.add(update);
    surveyModel.onCurrentPageChanged.add(update);

    return () => {
      surveyModel.onValueChanged.remove(update);
      surveyModel.onCurrentPageChanged.remove(update);
    };
  }, [surveyModel]);

  if (forms.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        No forms are assigned to this place yet. Ask your manager to assign a form before submitting a visit report.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-sm font-bold text-slate-800">Assigned form</span>
        <select
          className="mt-3 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          onChange={(event) => setSelectedFormId(event.target.value)}
          value={effectiveSelectedFormId}
        >
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>
      </label>

      {selectedForm?.description ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{selectedForm.description}</p>
      ) : null}

      {isMounted && surveyModel ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <Survey key={selectedForm?.id ?? "survey"} model={surveyModel} />
        </div>
      ) : (
        <div className="min-h-40 rounded-2xl border border-slate-200 bg-slate-50" />
      )}
    </div>
  );
}
