import { headers } from "next/headers";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { toSessionDto } from "@/features/auth/dto/session-dto";
import { fail, ok } from "@/shared/api/api-response";
import { jsonFailure, jsonSuccess } from "@/shared/api/http";

export async function GET() {
  const requestId = (await headers()).get("x-request-id") ?? crypto.randomUUID();

  try {
    const session = await createAuthService().requireSession();
    return jsonSuccess(ok(toSessionDto(session), requestId));
  } catch (error) {
    return jsonFailure(fail(error, requestId));
  }
}
