import { LoadingLink as Link } from "@/shared/loading";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { createFormsService } from "@/features/forms/server/forms-service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "PP";
}

export default async function TemplatesFormsPage() {
  const session = await createAuthService().requireSession();

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    redirect("/reports");
  }

  const forms = await createFormsService().listManagedForms();
  const ownerName = session.user.fullName || session.user.email;
  const ownerBadge = initialsFromName(ownerName);

  return (
    <main className="space-y-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[3.25rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">Forms</h1>
          <p className="mt-7 text-[18px] font-normal leading-8 text-slate-500">
            Use forms to keep record of your reps activities.
          </p>
        </div>

        <label className="mt-2 flex items-center gap-4 pt-2 text-[18px] font-normal text-slate-800">
          <input className="h-9 w-9 rounded-[10px] border-slate-300 text-cyan-600" type="checkbox" />
          Show inactive forms
        </label>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-[376px]">
          <svg className="pointer-events-none absolute left-7 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
          <input
            className="h-[58px] w-full rounded-2xl border border-white/70 bg-white px-18 text-[18px] font-normal text-slate-700 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.18)] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            placeholder="Search forms"
            type="text"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            className="inline-flex h-[58px] items-center justify-center gap-4 rounded-2xl border border-slate-300 bg-white px-8 text-[18px] font-semibold text-slate-800 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.16)]"
            type="button"
          >
            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 6h8M8 12h8M8 18h8M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Reorder forms on mobile app
          </button>
          <Link
            className="inline-flex h-[58px] items-center justify-center gap-4 rounded-2xl bg-cyan-500 px-9 text-[18px] font-semibold text-white shadow-[0_20px_38px_-22px_rgba(6,182,212,0.85)] transition hover:bg-cyan-600"
            href={"/templates/forms/new" as Route}
          >
            <span className="text-[30px] leading-none">+</span>
            New form
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_26px_-22px_rgba(15,23,42,0.22)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200 bg-white text-[16px] text-slate-500">
              <tr>
                <th className="px-6 py-5 font-semibold">Name</th>
                <th className="px-6 py-5 font-semibold">Status</th>
                <th className="px-6 py-5 font-semibold">Last modified</th>
                <th className="px-6 py-5 font-semibold">Visibility status</th>
                <th className="px-6 py-5 font-semibold">Order on mobile</th>
                <th className="px-4 py-5" />
              </tr>
            </thead>
            <tbody>
              {forms.length > 0 ? (
                forms.map((form, index) => (
                  <tr className="border-b border-slate-200/90 last:border-b-0" key={form.id}>
                    <td className="px-6 py-7 align-top">
                      <Link
                        className="text-[16px] font-semibold leading-7 text-cyan-600 hover:text-cyan-700 whitespace-nowrap"
                        href={`/templates/forms/${form.id}` as Route}
                      >
                        {form.name}
                      </Link>
                      {form.description ? (
                        <p className="mt-1 max-w-md text-[14px] leading-6 text-slate-500">{form.description}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-7 align-top text-[16px] text-slate-700">
                      <span className="inline-flex items-center gap-3 leading-7">
                        <span className="h-3.5 w-3.5 rounded-full bg-teal-500" />
                        {form.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-7 align-top">
                      <div className="flex items-start gap-4">
                        <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-orange-600 text-[20px] font-medium text-white">
                          {ownerBadge}
                        </span>
                        <div>
                          <p className="max-w-[160px] truncate text-[16px] font-medium leading-7 text-slate-700">{ownerName}</p>
                          <p className="mt-1 text-[14px] leading-6 text-slate-500">{formatDate(form.updated_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-7 align-top text-[16px] text-slate-700">
                      <div>
                        <span className="inline-flex items-center gap-3 leading-7">
                          <span className="h-3.5 w-3.5 rounded-full bg-teal-500" />
                          Visible
                        </span>
                        <p className="mt-1 text-[14px] font-semibold leading-6 text-cyan-600">{form.assignmentCount} rules</p>
                      </div>
                    </td>
                    <td className="px-6 py-7 align-top text-[16px] leading-7 text-slate-700">{index + 1}</td>
                    <td className="px-4 py-7 align-top">
                      <Link
                        aria-label={`Edit ${form.name}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        href={`/templates/forms/${form.id}` as Route}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M12 5.5a1.5 1.5 0 1 1 0 .01M12 12a1.5 1.5 0 1 1 0 .01M12 18.5a1.5 1.5 0 1 1 0 .01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-28 text-center text-[18px] text-slate-500" colSpan={6}>
                    No forms created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
