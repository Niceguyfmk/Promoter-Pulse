"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Note: We'll use a client action or direct supabase call here since it's a password update
import { createSupabaseBrowserClient } from "@/shared/supabase/client";
import { ButtonLoader, useLoading } from "@/shared/loading";
import { SentryLogo } from "@/features/navigation/components/SentryLogo";

export default function SetPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { startRouteTransition } = useLoading();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !session) {
        setError("This password link is invalid or has expired. Request a new reset link.");
        return;
      }

      setIsSessionReady(true);
    };

    void checkSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        setError(null);
        setIsSessionReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    startTransition(async () => {
      // For password updates after clicking a link, we use the client-side session
      // that was automatically established by the redirect
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Success! Redirect to the dashboard
        startRouteTransition("Loading dashboard");
        router.push("/");
      }
    });
  }

  return (
    <section className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center sm:items-start sm:text-left">
        <SentryLogo className="mb-5" size={44} />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-garnet">Secure Access</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
          Set your password
        </h1>
        <p className="mt-2 text-text-2">Choose a strong new password for your account.</p>
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
          <label className="text-sm font-semibold text-text-2" htmlFor="password">
            New Password
          </label>
          <input
            id="password"
            className="h-12 w-full rounded-lg border border-ink-3 bg-ink px-4 text-base text-white transition-all outline-none placeholder:text-text-2 focus:border-garnet focus:ring-4 focus:ring-garnet/20 disabled:opacity-50"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending || !isSessionReady}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-text-2" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            className="h-12 w-full rounded-lg border border-ink-3 bg-ink px-4 text-base text-white transition-all outline-none placeholder:text-text-2 focus:border-garnet focus:ring-4 focus:ring-garnet/20 disabled:opacity-50"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending || !isSessionReady}
          />
        </div>

        <button
          className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-garnet px-4 text-base font-bold text-white transition-all hover:bg-garnet-dark active:scale-[0.98] disabled:opacity-70"
          type="submit"
          disabled={isPending || !isSessionReady}
        >
          <ButtonLoader
            label={isSessionReady ? "Update Password" : "Validating link..."}
            loading={isPending}
            loadingLabel="Saving password..."
          />
        </button>
      </form>
    </section>
  );
}
