import { NextResponse } from "next/server";

import type { ApiFailure, ApiSuccess } from "./api-response";

const statusByCode: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 409,
  INTERNAL_ERROR: 500
};

export function jsonSuccess<T>(body: ApiSuccess<T>): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(body, { status: 200 });
}

export function jsonFailure(body: ApiFailure): NextResponse<ApiFailure> {
  return NextResponse.json(body, {
    status: statusByCode[body.error.code] ?? 500
  });
}
