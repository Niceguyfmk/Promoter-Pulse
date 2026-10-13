"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/features/auth/server/auth-actions";
import { ButtonLoader } from "@/shared/loading";
import { SentryLogo } from "@/features/navigation/components/SentryLogo";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <section className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center sm:items-start sm:text-left">
        <SentryLogo className="mb-5" size={44} />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-garnet">SentryAI</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Reset password</h1>
        <p className="mt-2 text-text-2">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>
      </div>

      {sent ? (
        <div className="space-y-5 rounded-2xl border border-ink-3 bg-ink-2 p-8 shadow-xl shadow-black/30">
          <p className="text-sm font-medium text-white">
            If an account exists for that email, we&apos;ve sent a password reset link. Check your
            inbox and spam folder.
          </p>
        </div>
      ) : (
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

          <button
            className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-garnet px-4 text-base font-bold text-white transition-all hover:bg-garnet-dark active:scale-[0.98] disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            <ButtonLoader label="Send reset link" loading={isPending} loadingLabel="Sending..." />
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-text-2">
        <a href="/login" className="font-bold text-brass hover:text-brass/80">
          Back to sign in
        </a>
      </p>
    </section>
  );
}
