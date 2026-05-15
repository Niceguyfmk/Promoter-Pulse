"use server";

import {
  deleteCompany,
  updateCompany,
  updateCompanyActiveStatus
} from "@/features/auth/server/auth-actions";

export async function updateCompanyFromCompaniesPage(formData: FormData) {
  await updateCompany(formData);
}

export async function updateCompanyActiveStatusFromCompaniesPage(formData: FormData) {
  await updateCompanyActiveStatus(formData);
}

export async function deleteCompanyFromCompaniesPage(formData: FormData) {
  await deleteCompany(formData);
}
