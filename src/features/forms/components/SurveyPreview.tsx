"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { promoterPulseTheme } from "../lib/theme";

import { normalizeSurveyAnswers } from "../lib/survey-schema";
import type { Json } from "@/shared/supabase/database.types";

export function SurveyPreview({
  answers,
  readOnly = true,
  schema
}: {
  answers?: Record<string, Json>;
  readOnly?: boolean;
  schema: Json;
}) {
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const model = useMemo(() => {
    const next = new Model(schema);
    next.applyTheme(promoterPulseTheme);
    next.data = normalizeSurveyAnswers(answers);
    next.mode = readOnly ? "display" : "edit";
    next.showCompletedPage = false;
    next.showNavigationButtons = !readOnly;
    next.completeText = "Done";
    return next;
  }, [answers, readOnly, schema]);

  if (!isMounted) {
    return <div className="min-h-32 rounded-2xl bg-slate-50" />;
  }

  return <Survey model={model} />;
}
