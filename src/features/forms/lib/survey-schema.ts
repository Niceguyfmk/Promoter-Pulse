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

export function extractSurveyLabels(schema: Json): Record<string, string> {
  const labels: Record<string, string> = {};

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return labels;
  }

  function traverse(obj: unknown) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }

    const rec = obj as Record<string, unknown>;
    if (typeof rec.name === "string" && rec.name) {
      if (typeof rec.title === "string" && rec.title.trim()) {
        labels[rec.name] = rec.title.trim();
      } else if (
        rec.title &&
        typeof rec.title === "object" &&
        !Array.isArray(rec.title) &&
        "default" in rec.title &&
        typeof rec.title.default === "string"
      ) {
        labels[rec.name] = rec.title.default.trim();
      } else {
        labels[rec.name] = rec.name; // Fallback to name if no title
      }
    }

    for (const value of Object.values(rec)) {
      if (value && typeof value === "object") {
        traverse(value);
      }
    }
  }

  traverse(schema);
  return labels;
}
