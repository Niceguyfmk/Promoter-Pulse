import { redirect } from "next/navigation";
import type { Route } from "next";

export default function DashboardRoot() {
  redirect("/activities" as Route);
}
