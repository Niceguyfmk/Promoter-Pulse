import "server-only";

import type { IdentityProvider, IdentityProviderSession } from "@/core/auth/auth-provider";
import { createSupabaseServerClient } from "@/shared/supabase/server";

import { cache } from "react";

// Module-scoped so React's per-request memoization is shared across every
// `new SupabaseIdentityProvider()` instance instead of being reset each time.
const getCurrentSession = cache(async (): Promise<IdentityProviderSession | null> => {
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

export class SupabaseIdentityProvider implements IdentityProvider {
  getCurrentSession(): Promise<IdentityProviderSession | null> {
    return getCurrentSession();
  }

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
}
