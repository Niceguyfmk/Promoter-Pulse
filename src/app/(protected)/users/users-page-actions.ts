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
export async function saveUserFromUsersPage(formData: FormData): Promise<{ error?: string }> {
  for (const update of [updateUserName, updateUserCompany, updateUserRole]) {
    const result = await update(formData);

    if (result && "error" in result && result.error) {
      return { error: result.error };
    }
  }

  return {};
}

export async function updateUserActiveStatusFromUsersPage(
  formData: FormData
): Promise<{ error?: string }> {
  const result = await updateUserActiveStatus(formData);
  return result && "error" in result && result.error ? { error: result.error } : {};
}

export async function deleteUserFromUsersPage(formData: FormData): Promise<{ error?: string }> {
  const result = await deleteUser(formData);
  return result && "error" in result && result.error ? { error: result.error } : {};
}
