"use client";

import { useTransition, useState, useEffect } from "react";
import { signIn } from "@/features/auth/server/auth-actions";
import { ButtonLoader } from "@/shared/loading";

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
      <div className="mb-8 text-center sm:text-left">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-600">Promoter Pulse</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-2 text-slate-600">Sign in to manage your retail operations</p>
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
          <label className="text-sm font-semibold text-slate-700" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base transition-all outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
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
            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <a href="#" className="text-xs font-semibold text-cyan-700 hover:text-cyan-800">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base transition-all outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
            name="password"
            type="password"
            autoComplete="current-password"
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
          <ButtonLoader label="Sign in" loading={isPending} loadingLabel="Signing in..." />
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-bold text-cyan-700 hover:text-cyan-800">
          Create one now
        </a>
      </p>
    </section>
  );
}
