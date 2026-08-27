"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { CheckInError, setBlockerStatus } from "@/lib/checkins";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "DROPPED"] as const;
type Status = (typeof STATUSES)[number];

/**
 * Close out, reopen, or progress a blocker from the Blockers page.
 *
 * The status comes from the submit button's name/value pair, so one form
 * drives Resolve, Drop and Mark in progress without client JavaScript.
 *
 * setBlockerStatus does the permission check (owner, the person who raised
 * it, their management chain, or an admin) and stores the resolution note.
 * A refused change leaves the blocker in the open list, which is the
 * feedback — the page only ever lists blockers the viewer may act on.
 */
export async function setBlockerStatusFromListAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  const blockerId = String(formData.get("blockerId") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolution = String(formData.get("resolution") ?? "");

  if (!STATUSES.includes(status as Status)) return;

  try {
    await setBlockerStatus(
      blockerId,
      { id: user.id, role: user.role },
      status as Status,
      resolution
    );
  } catch (e) {
    if (e instanceof CheckInError) {
      console.error("blocker status change refused:", e.message);
      return;
    }
    throw e;
  }
  revalidatePath("/blockers");
}
