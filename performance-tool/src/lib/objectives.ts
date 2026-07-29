import { db } from "@/lib/db";
import { canViewUser, type Viewer } from "@/lib/authz";

/**
 * Development objectives (brief §7). The subject, their management chain,
 * and admins can add objectives and progress notes; the "Own development"
 * scorecard measure is rated against the current active objective.
 */

export class ObjectiveError extends Error {}

async function assertCanManage(viewer: Viewer, subjectId: string) {
  if (viewer.id === subjectId) return;
  if (!(await canViewUser(viewer, subjectId))) {
    throw new ObjectiveError("You do not have access to this person's objectives.");
  }
}

export async function createObjective(
  viewer: Viewer,
  input: { userId: string; title: string; detail: string | null; targetDate: string | null }
) {
  await assertCanManage(viewer, input.userId);
  if (!input.title.trim()) throw new ObjectiveError("The objective needs a title.");
  return db.developmentObjective.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      detail: input.detail?.trim() || null,
      targetDate: input.targetDate ? new Date(`${input.targetDate}T00:00:00.000Z`) : null,
    },
  });
}

export async function addObjectiveNote(
  viewer: Viewer,
  objectiveId: string,
  note: string
) {
  const objective = await db.developmentObjective.findUnique({
    where: { id: objectiveId },
  });
  if (!objective) throw new ObjectiveError("Objective not found.");
  await assertCanManage(viewer, objective.userId);
  if (!note.trim()) throw new ObjectiveError("Write the progress note first.");
  return db.developmentObjectiveNote.create({
    data: { objectiveId, authorId: viewer.id, note: note.trim() },
  });
}

export async function setObjectiveStatus(
  viewer: Viewer,
  objectiveId: string,
  status: "ACTIVE" | "ACHIEVED" | "DROPPED"
) {
  const objective = await db.developmentObjective.findUnique({
    where: { id: objectiveId },
  });
  if (!objective) throw new ObjectiveError("Objective not found.");
  await assertCanManage(viewer, objective.userId);
  return db.developmentObjective.update({
    where: { id: objectiveId },
    data: { status },
  });
}

export async function objectivesFor(userId: string) {
  return db.developmentObjective.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
}
