import { AppError, isAppError } from "@/core/errors/app-error";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, requestId: string): ApiSuccess<T> {
  return { ok: true, data, requestId };
}

export function fail(error: unknown, requestId: string): ApiFailure {
  const appError = isAppError(error)
    ? error
    : new AppError("INTERNAL_ERROR", "An unexpected error occurred", error);

  return {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message
    },
    requestId
  };
}
