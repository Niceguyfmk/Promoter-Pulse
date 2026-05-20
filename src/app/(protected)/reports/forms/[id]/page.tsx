import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function EditSurveyFormPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/templates/forms/${id}` as Route);
}
