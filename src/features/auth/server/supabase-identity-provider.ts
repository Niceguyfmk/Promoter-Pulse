import "server-only";

import type { IdentityProvider, IdentityProviderSession } from "@/core/auth/auth-provider";
import { createSupabaseServerClient } from "@/shared/supabase/server";

import { cache } from "react";

export class SupabaseIdentityProvider implements IdentityProvider {
  getCurrentSession = cache(async (): Promise<IdentityProviderSession | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return null;
    }

    return {
      identity: {
        provider: "supabase",
        providerUserId: user.id,
        email: user.email
      },
      accessTokenExpiresAt: null
    };
  });

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
}
