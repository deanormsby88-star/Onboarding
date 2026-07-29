"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import {
  addObjectiveNote,
  createObjective,
  ObjectiveError,
  setObjectiveStatus,
} from "@/lib/objectives";

type Result = { error?: string };

async function run(fn: (viewer: { id: string; role: "EMPLOYEE" | "MANAGER" | "ADMIN" }) => Promise<unknown>): Promise<Result> {
  const user = await requireUser();
  try {
    await fn({ id: user.id, role: user.role });
    return {};
  } catch (e) {
    if (e instanceof ObjectiveError) return { error: e.message };
    throw e;
  }
}

export async function createObjectiveAction(
  subjectId: string,
  formData: FormData
): Promise<Result> {
  const result = await run((viewer) =>
    createObjective(viewer, {
      userId: subjectId,
      title: String(formData.get("title") ?? ""),
      detail: String(formData.get("detail") ?? "") || null,
      targetDate: String(formData.get("targetDate") ?? "") || null,
    })
  );
  revalidatePath("/objectives");
  revalidatePath(`/team/${subjectId}`);
  return result;
}

export async function addObjectiveNoteAction(
  objectiveId: string,
  formData: FormData
): Promise<Result> {
  const result = await run((viewer) =>
    addObjectiveNote(viewer, objectiveId, String(formData.get("note") ?? ""))
  );
  revalidatePath("/objectives");
  return result;
}

export async function setObjectiveStatusAction(
  objectiveId: string,
  status: "ACTIVE" | "ACHIEVED" | "DROPPED"
): Promise<Result> {
  const result = await run((viewer) =>
    setObjectiveStatus(viewer, objectiveId, status)
  );
  revalidatePath("/objectives");
  return result;
}
