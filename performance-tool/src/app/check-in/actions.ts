"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import {
  acknowledge,
  CheckInError,
  managerDraftSchema,
  markDiscussionHeld,
  promoteBlocker,
  reopenMissed,
  saveManagerDraft,
  saveSelfDraft,
  selfDraftSchema,
  setBlockerStatus,
  submitManager,
  submitSelf,
} from "@/lib/checkins";
import { db } from "@/lib/db";
import { notifyBothSubmitted } from "@/lib/notifications";

async function notifyIfBothSubmitted(checkInId: string) {
  const checkIn = await db.checkIn.findUnique({
    where: { id: checkInId },
    select: { status: true },
  });
  if (checkIn?.status === "AWAITING_DISCUSSION") {
    // Fire-and-forget; a mail failure never blocks a submission.
    notifyBothSubmitted(checkInId).catch((e) =>
      console.error("both-submitted notification failed:", e)
    );
  }
}

export type ActionResult = { error?: string; savedAt?: string };

async function run(fn: (viewer: { id: string; role: "EMPLOYEE" | "MANAGER" | "ADMIN" }) => Promise<void>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await fn({ id: user.id, role: user.role });
    return { savedAt: new Date().toISOString() };
  } catch (e) {
    if (e instanceof CheckInError) return { error: e.message };
    throw e;
  }
}

export async function saveSelfDraftAction(
  checkInId: string,
  payload: string
): Promise<ActionResult> {
  const parsed = selfDraftSchema.safeParse(JSON.parse(payload));
  if (!parsed.success) return { error: "Could not save the draft. Reload and try again." };
  return run((viewer) => saveSelfDraft(checkInId, viewer, parsed.data));
}

export async function submitSelfAction(checkInId: string): Promise<ActionResult> {
  const result = await run((viewer) => submitSelf(checkInId, viewer));
  if (!result.error) {
    revalidatePath("/check-in");
    await notifyIfBothSubmitted(checkInId);
  }
  return result;
}

export async function saveManagerDraftAction(
  checkInId: string,
  payload: string
): Promise<ActionResult> {
  const parsed = managerDraftSchema.safeParse(JSON.parse(payload));
  if (!parsed.success) return { error: "Could not save the draft. Reload and try again." };
  return run((viewer) => saveManagerDraft(checkInId, viewer, parsed.data));
}

export async function submitManagerAction(checkInId: string): Promise<ActionResult> {
  const result = await run((viewer) => submitManager(checkInId, viewer));
  if (!result.error) {
    revalidatePath("/team");
    await notifyIfBothSubmitted(checkInId);
  }
  return result;
}

export async function markDiscussionAction(checkInId: string): Promise<ActionResult> {
  const result = await run((viewer) => markDiscussionHeld(checkInId, viewer));
  if (!result.error) revalidatePath(`/check-in/${checkInId}`);
  return result;
}

export async function acknowledgeAction(checkInId: string): Promise<ActionResult> {
  const result = await run((viewer) => acknowledge(checkInId, viewer));
  if (!result.error) revalidatePath(`/check-in/${checkInId}`);
  return result;
}

export async function promoteBlockerAction(
  checkInId: string,
  formData: FormData
): Promise<ActionResult> {
  const description = String(formData.get("description") ?? "");
  const ownerId = String(formData.get("ownerId") ?? "");
  const target = String(formData.get("targetDate") ?? "");
  const result = await run((viewer) =>
    promoteBlocker({
      checkInId,
      viewer,
      description,
      ownerId,
      targetDate: target ? new Date(`${target}T00:00:00.000Z`) : null,
    })
  );
  if (!result.error) revalidatePath(`/check-in/${checkInId}`);
  return result;
}

export async function setBlockerStatusAction(
  blockerId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DROPPED",
  resolution?: string
): Promise<ActionResult> {
  return run((viewer) => setBlockerStatus(blockerId, viewer, status, resolution));
}

export async function reopenMissedAction(
  checkInId: string,
  formData: FormData
): Promise<ActionResult> {
  const reason = String(formData.get("reason") ?? "");
  const result = await run((viewer) => reopenMissed(checkInId, viewer, reason));
  if (!result.error) revalidatePath(`/check-in/${checkInId}`);
  return result;
}
