import type { AuthProvider } from "./auth-provider";
import type { Permission } from "./permissions";
import type { Role } from "./roles";

export type ApplicationUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  authProvider: AuthProvider;
  authProviderUserId: string;
  isActive: boolean;
};

export type AppSession = {
  user: ApplicationUser;
  roles: Role[];
  permissions: Permission[];
};
