import type { Route } from "next";
import { redirect } from "next/navigation";

export default function TemplatesPage() {
  redirect("/templates/forms" as Route);
}
