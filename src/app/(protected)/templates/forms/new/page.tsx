import { LoadingLink as Link } from "@/shared/loading";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAuthService } from "@/features/auth/server/app-auth-service";
import { SurveyFormEditor } from "@/features/forms/components/SurveyFormEditor";
import { createSurveyFormAction } from "@/features/forms/server/form-actions";

export default async function NewTemplateFormPage() {
  const session = await createAuthService().requireSession();

  if (!session.roles.some((role) => role === "admin" || role === "manager")) {
    redirect("/templates/forms" as Route);
  }

  return (
    <main className="space-y-6 lg:space-y-8">
      <div>
        <Link
          className="text-sm font-bold text-text-2 hover:text-text"
          href={"/templates/forms" as Route}
        >
          Back to forms
        </Link>
        <p className="mt-4 text-sm font-medium text-text-2">Templates / Forms</p>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">Create form</h1>
      </div>

      <SurveyFormEditor action={createSurveyFormAction} />
    </main>
  );
}
