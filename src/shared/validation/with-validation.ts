import { AppError } from "@/core/errors/app-error";
import type { z } from "zod";

export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown
): z.infer<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", "Request validation failed", result.error.flatten());
  }

  return result.data;
}
