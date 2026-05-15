export type AuditAction =
  | "auth.session_resolved"
  | "shift.check_in"
  | "shift.check_out"
  | "photo.signed_upload_requested"
  | "admin.user_updated";

export type AuditEventInput = {
  tenantId: string;
  actorUserId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export interface AuditService {
  record(event: AuditEventInput): Promise<void>;
}
