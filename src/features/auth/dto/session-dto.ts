import type { AppSession } from "@/core/auth/session";

export type SessionDto = {
  user: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string | null;
  };
  roles: string[];
  permissions: string[];
};

export function toSessionDto(session: AppSession): SessionDto {
  return {
    user: {
      id: session.user.id,
      tenantId: session.user.tenantId,
      email: session.user.email,
      fullName: session.user.fullName
    },
    roles: session.roles,
    permissions: session.permissions
  };
}
