"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import {
  createUser,
  setUserActive,
  updateUser,
  userInputSchema,
  UserValidationError,
} from "@/lib/users";

export type UserFormState = { error?: string };

function parseForm(formData: FormData) {
  return userInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    jobTitle: formData.get("jobTitle") ?? "",
    role: formData.get("role"),
    managerId: formData.get("managerId") || null,
  });
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await createUser(parsed.data);
  } catch (e) {
    if (e instanceof UserValidationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserAction(
  userId: string,
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    await updateUser(userId, parsed.data);
  } catch (e) {
    if (e instanceof UserValidationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const admin = await requireAdmin();
  try {
    await setUserActive(userId, admin, active);
  } catch (e) {
    if (e instanceof UserValidationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/users");
  return {};
}
