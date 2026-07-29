"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import {
  addPipReview,
  addSupportAction,
  closePip,
  createPip,
  PipError,
  pipCreateSchema,
} from "@/lib/pips";

type Result = { error?: string };

export async function createPipAction(
  _prev: Result,
  formData: FormData
): Promise<Result> {
  const admin = await requireAdmin();
  const measureIds = formData.getAll("measureId").map(String);
  const measures = measureIds
    .filter((id) => formData.get(`include-${id}`) === "on")
    .map((id) => ({
      measureId: id,
      shortfall: String(formData.get(`shortfall-${id}`) ?? ""),
    }));
  const parsed = pipCreateSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    standardRequired: String(formData.get("standardRequired") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    measures,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  let pipId: string;
  try {
    const pip = await createPip(admin, parsed.data);
    pipId = pip.id;
  } catch (e) {
    if (e instanceof PipError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/pips");
  redirect(`/admin/pips/${pipId}`);
}

export async function addSupportActionAction(
  pipId: string,
  formData: FormData
): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await addSupportAction(admin, pipId, {
      type: String(formData.get("type") ?? "OTHER") as
        | "TRAINING"
        | "GUIDANCE"
        | "COUNSELLING"
        | "OTHER",
      description: String(formData.get("description") ?? ""),
      providedAt: String(formData.get("providedAt") ?? ""),
    });
  } catch (e) {
    if (e instanceof PipError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/pips/${pipId}`);
  return {};
}

export async function addPipReviewAction(
  pipId: string,
  formData: FormData
): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await addPipReview(admin, pipId, {
      reviewDate: String(formData.get("reviewDate") ?? ""),
      outcome: String(formData.get("outcome") ?? ""),
      checkInId: String(formData.get("checkInId") ?? "") || null,
    });
  } catch (e) {
    if (e instanceof PipError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/pips/${pipId}`);
  return {};
}

export async function closePipAction(
  pipId: string,
  formData: FormData
): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await closePip(admin, pipId, {
      finalOutcome: String(formData.get("finalOutcome") ?? ""),
      outcomeReasoning: String(formData.get("outcomeReasoning") ?? ""),
    });
  } catch (e) {
    if (e instanceof PipError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/pips/${pipId}`);
  return {};
}
