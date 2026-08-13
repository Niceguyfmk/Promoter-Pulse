"use client";

import { LoadingLink as Link } from "@/shared/loading";
import { SentryLogo } from "@/features/navigation/components/SentryLogo";

export default function SignupPage() {
  return (
    <section className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <SentryLogo className="mb-5" size={44} />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-garnet">SentryAI</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Invite required</h1>
        <p className="mt-2 text-text-2">
          Accounts are created only through platform-admin invites.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-3 bg-ink-2 p-8 text-center shadow-xl shadow-black/30">
        <p className="text-sm leading-6 text-text-2">
          Ask your platform administrator for an invite. If your company is new, the admin will
          create a tenant and invite you as a{" "}
          <span className="font-semibold text-white">promoter</span>.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-text-2">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brass hover:text-brass/80">
          Sign in
        </Link>
      </p>
    </section>
  );
}
