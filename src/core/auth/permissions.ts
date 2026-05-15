export const permissions = [
  "attendance:read",
  "attendance:write",
  "audits:read",
  "audits:write",
  "photos:read",
  "photos:write",
  "reports:read",
  "users:manage",
  "tenant:manage"
] as const;

export type Permission = (typeof permissions)[number];

export function hasPermission(grants: readonly Permission[], required: Permission): boolean {
  return grants.includes(required);
}
