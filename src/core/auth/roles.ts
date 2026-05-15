export const roles = ["admin", "manager", "promoter"] as const;

export type Role = (typeof roles)[number];

export const defaultRoleHome: Record<Role, string> = {
  admin: "/activities",
  manager: "/activities",
  promoter: "/activities"
};
