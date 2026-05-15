export const authProviders = ["supabase", "okta", "auth0", "azure_ad"] as const;

export type AuthProvider = (typeof authProviders)[number];

export type ProviderIdentity = {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
};

export type IdentityProviderSession = {
  identity: ProviderIdentity;
  accessTokenExpiresAt: Date | null;
};

export interface IdentityProvider {
  getCurrentSession(): Promise<IdentityProviderSession | null>;
  signOut(): Promise<void>;
}
