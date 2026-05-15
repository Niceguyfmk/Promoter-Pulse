"use server";

import {
  deleteUser,
  updateUserActiveStatus,
  updateUserRole
} from "@/features/auth/server/auth-actions";

export async function updateUserRoleFromUsersPage(formData: FormData) {
  await updateUserRole(formData);
}

export async function updateUserActiveStatusFromUsersPage(formData: FormData) {
  await updateUserActiveStatus(formData);
}

export async function deleteUserFromUsersPage(formData: FormData) {
  await deleteUser(formData);
}
