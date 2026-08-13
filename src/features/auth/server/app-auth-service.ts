import "server-only";

import { AppError, isAppError } from "@/core/errors/app-error";
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

    let resolved;
    try {
      resolved = await findApplicationUserByIdentity(providerSession.identity);
    } catch (error) {
      // The Supabase Auth session is valid, but we couldn't look up the matching
      // application user (e.g. the database was briefly unreachable). Don't crash
      // the whole page for this — sign the stale session out and send the user
      // back to login, where they can retry.
      if (isAppError(error) && error.code === "INTERNAL_ERROR") {
        console.error(
          "[AppAuthService] Falling back to signed-out session after lookup failure:",
          error
        );
        await this.identityProvider.signOut();
        return null;
      }
      throw error;
    }

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
