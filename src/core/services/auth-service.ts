import type { AppSession } from "@/core/auth/session";

export interface AuthService {
  getSession(): Promise<AppSession | null>;
  requireSession(): Promise<AppSession>;
}
