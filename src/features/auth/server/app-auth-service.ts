import "server-only";

import { AppError } from "@/core/errors/app-error";
import type { AuthService } from "@/core/services/auth-service";
import type { AppSession } from "@/core/auth/session";

import { SupabaseIdentityProvider } from "./supabase-identity-provider";
import { findApplicationUserByIdentity } from "./user-repository";

export class AppAuthService implements AuthService {
  constructor(private readonly identityProvider = new SupabaseIdentityProvider()) {}

  async getSession(): Promise<AppSession | null> {
    const providerSession = await this.identityProvider.getCurrentSession();

    if (!providerSession) {
      return null;
    }

    const resolved = await findApplicationUserByIdentity(providerSession.identity);

    if (!resolved?.user.isActive) {
      await this.identityProvider.signOut();
      return null;
    }

    return resolved;
  }

  async requireSession(): Promise<AppSession> {
    const session = await this.getSession();

    if (!session) {
      throw new AppError("UNAUTHENTICATED", "Authentication is required");
    }

    return session;
  }
}

export function createAuthService(): AuthService {
  return new AppAuthService();
}
