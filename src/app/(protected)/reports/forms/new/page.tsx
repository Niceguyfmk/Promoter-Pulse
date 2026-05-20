import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function NewSurveyFormPage() {
  redirect("/templates/forms/new" as Route);
}
