import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { SurveyFormEditor } from "@/features/forms/components/SurveyFormEditor";
import { deleteSurveyFormAction, updateSurveyFormAction } from "@/features/forms/server/form-actions";
import { createFormsService } from "@/features/forms/server/forms-service";

export default async function EditTemplateFormPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, createAuthService().requireSession()]);

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    redirect("/templates/forms" as Route);
  }

  const form = await createFormsService().getManagedForm(id);
  if (!form) {
    notFound();
  }

  return (
    <main className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-slate-600 hover:text-slate-950" href={"/templates/forms" as Route}>
            Back to forms
          </Link>
          <p className="mt-4 text-sm font-medium text-slate-500">Templates / Forms</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{form.name}</h1>
        </div>

        <form action={deleteSurveyFormAction}>
          <input name="formId" type="hidden" value={form.id} />
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-700 transition hover:bg-red-50"
            type="submit"
          >
            Delete form
          </button>
        </form>
      </div>

      <SurveyFormEditor
        action={updateSurveyFormAction}
        initialValue={{
          id: form.id,
          name: form.name,
          description: form.description,
          schemaJson: form.schema_json,
          isActive: form.is_active
        }}
      />
    </main>
  );
}
