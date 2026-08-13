"use client";

import { useTransition, useState, useEffect } from "react";
import { signIn } from "@/features/auth/server/auth-actions";
import { ButtonLoader } from "@/shared/loading";
import { SentryLogo } from "@/features/navigation/components/SentryLogo";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Handle fragments (like #access_token=...) which Next.js Server Components can't see
  useEffect(() => {
    if (window.location.hash.includes("access_token=")) {
      window.location.href = "/set-password";
    }
  }, []);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <section className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center sm:items-start sm:text-left">
        <SentryLogo className="mb-5" size={44} />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-garnet">SentryAI</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-text-2">Sign in to run your field operations</p>
      </div>

      <form
        action={handleSubmit}
        className="space-y-5 rounded-2xl border border-ink-3 bg-ink-2 p-8 shadow-xl shadow-black/30"
      >
        {error && (
          <div className="rounded-lg bg-danger-tint p-4 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-text-2" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="h-12 w-full rounded-lg border border-ink-3 bg-ink px-4 text-base text-white transition-all outline-none placeholder:text-text-2 focus:border-garnet focus:ring-4 focus:ring-garnet/20 disabled:opacity-50"
            inputMode="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-2" htmlFor="password">
              Password
            </label>
            <a href="#" className="text-xs font-semibold text-brass hover:text-brass/80">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            className="h-12 w-full rounded-lg border border-ink-3 bg-ink px-4 text-base text-white transition-all outline-none placeholder:text-text-2 focus:border-garnet focus:ring-4 focus:ring-garnet/20 disabled:opacity-50"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={isPending}
          />
        </div>

        <button
          className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-garnet px-4 text-base font-bold text-white transition-all hover:bg-garnet-dark active:scale-[0.98] disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          <ButtonLoader label="Sign in" loading={isPending} loadingLabel="Signing in..." />
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-text-2">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-bold text-brass hover:text-brass/80">
          Create one now
        </a>
      </p>
    </section>
  );
}
