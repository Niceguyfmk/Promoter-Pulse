"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/supabase/server";
// Note: We'll use a client action or direct supabase call here since it's a password update
import { createSupabaseBrowserClient } from "@/shared/supabase/client";

export default function SetPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();



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
      const supabase = createSupabaseBrowserClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Success! Redirect to the dashboard
        router.push("/");
      }
    });
  }

  return (
    <section className="w-full max-w-sm">
      <div className="mb-8 text-center sm:text-left">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-600">Secure Access</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Set your password</h1>
        <p className="mt-2 text-slate-600">Choose a strong password to activate your account.</p>
      </div>

      <form 
        action={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"
      >
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700" htmlFor="password">
            New Password
          </label>
          <input
            id="password"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base transition-all outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base transition-all outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending}
          />
        </div>

        <button
          className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-cyan-900 px-4 text-base font-bold text-white transition-all hover:bg-cyan-950 active:scale-[0.98] disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving password...
            </span>
          ) : (
            "Activate Account"
          )}
        </button>
      </form>
    </section>
  );
}
