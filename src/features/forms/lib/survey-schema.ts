import type { Json } from "@/shared/supabase/database.types";

export type SurveySchema = Record<string, Json | undefined>;

export function isSurveySchema(value: unknown): value is SurveySchema {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSurveySchemaText(value: string): SurveySchema {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Schema must be valid JSON.");
  }

  if (!isSurveySchema(parsed)) {
    throw new Error("Schema must be a JSON object.");
  }

  return parsed;
}

export function surveySchemaText(schema: Json) {
  return JSON.stringify(schema, null, 2);
}

export function surveyTitleFromSchema(schema: Json, fallback: string) {
  if (isSurveySchema(schema) && typeof schema.title === "string" && schema.title.trim()) {
    return schema.title.trim();
  }

  return fallback;
}

export function surveyDescriptionFromSchema(schema: Json) {
  if (isSurveySchema(schema) && typeof schema.description === "string" && schema.description.trim()) {
    return schema.description.trim();
  }

  return null;
}

export function normalizeSurveyAnswers(value: unknown): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}
