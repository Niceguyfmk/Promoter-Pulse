"use server";

import {
  deleteUser,
  updateUserActiveStatus,
  updateUserCompany,
  updateUserName,
  updateUserRole
} from "@/features/auth/server/auth-actions";

// Applies every editable field in the row. Company goes before role because the
// role update reads the user's current company from the database.
export async function saveUserFromUsersPage(formData: FormData) {
  for (const update of [updateUserName, updateUserCompany, updateUserRole]) {
    const result = await update(formData);

    if (result && "error" in result) {
      return;
    }
  }
}

export async function updateUserActiveStatusFromUsersPage(formData: FormData) {
  await updateUserActiveStatus(formData);
}

export async function deleteUserFromUsersPage(formData: FormData) {
  await deleteUser(formData);
}
