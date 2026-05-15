"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <section className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-600">Promoter Pulse</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Invite required</h1>
        <p className="mt-2 text-slate-600">
          Accounts are created only through platform-admin invites.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <p className="text-sm leading-6 text-slate-600">
          Ask your platform administrator for an invite. If your company is new, the admin will
          create a tenant and invite you as a <span className="font-semibold text-slate-900">promoter</span>.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-cyan-700 hover:text-cyan-800">
          Sign in
        </Link>
      </p>
    </section>
  );
}
