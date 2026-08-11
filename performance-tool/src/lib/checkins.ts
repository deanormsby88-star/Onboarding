import type {
  CheckIn,
  CheckInStatus,
  MeasureRating,
  Prisma,
  RaterKind,
} from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { canViewUser, type Viewer } from "@/lib/authz";
import {
  getLiveScorecard,
  scorecardWithContent,
  type ScorecardWithContent,
} from "@/lib/scorecards";
import { currentIsoWeek, type IsoWeek } from "@/lib/weeks";

/**
 * Check-in workflow (brief §5). One check-in per person per ISO week.
 *
 * State machine:
 *   not_started → self_in_progress → awaiting_manager → awaiting_discussion
 *     → awaiting_acknowledgement → complete
 *   any → missed (scheduled close-out job); reopening is admin-only, logged.
 *
 * Blind scoring is enforced HERE, in the data layer: each side's ratings are
 * stripped from what the other side is given until the reveal condition is
 * met. The UI never sees what the viewer may not.
 */

export class CheckInError extends Error {}

const OPEN_STATUSES: CheckInStatus[] = [
  "NOT_STARTED",
  "SELF_IN_PROGRESS",
  "AWAITING_MANAGER",
];

export const STATUS_LABEL: Record<CheckInStatus, string> = {
  NOT_STARTED: "Not started",
  SELF_IN_PROGRESS: "Self-rating in progress",
  AWAITING_MANAGER: "Awaiting manager",
  AWAITING_DISCUSSION: "Ready to discuss",
  AWAITING_ACKNOWLEDGEMENT: "Awaiting acknowledgement",
  COMPLETE: "Complete",
  MISSED: "Missed",
};

// ---------------------------------------------------------------------------
// Creation / lookup
// ---------------------------------------------------------------------------

export const checkInInclude = {
  ratings: true,
  scorecard: { include: scorecardWithContent },
  user: { select: { id: true, name: true, managerId: true } },
  manager: { select: { id: true, name: true } },
  blockers: { include: { owner: { select: { id: true, name: true } } } },
} satisfies Prisma.CheckInInclude;

export type CheckInFull = Prisma.CheckInGetPayload<{
  include: typeof checkInInclude;
}>;

/**
 * Find or create the weekly check-in for a subject. Requires a live
 * scorecard and a manager; called when either side opens their form.
 */
export async function getOrCreateWeeklyCheckIn(
  subjectId: string,
  week: IsoWeek = currentIsoWeek()
): Promise<CheckInFull> {
  const existing = await db.checkIn.findUnique({
    where: {
      userId_isoYear_isoWeek_type: {
        userId: subjectId,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        type: "WEEKLY",
      },
    },
    include: checkInInclude,
  });
  if (existing) return existing;

  const subject = await db.user.findUnique({ where: { id: subjectId } });
  if (!subject || !subject.isActive) {
    throw new CheckInError("This person is not active.");
  }
  if (!subject.managerId) {
    throw new CheckInError(
      "No manager is set for this person, so a check-in cannot be created."
    );
  }
  const scorecard = await getLiveScorecard(subjectId);
  if (!scorecard) {
    throw new CheckInError(
      "No scorecard is assigned yet. An admin needs to assign one first."
    );
  }
  return db.checkIn.create({
    data: {
      userId: subjectId,
      managerId: subject.managerId,
      scorecardId: scorecard.id,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      type: "WEEKLY",
      events: { create: { toStatus: "NOT_STARTED" } },
    },
    include: checkInInclude,
  });
}

// ---------------------------------------------------------------------------
// Blind-scoring redaction
// ---------------------------------------------------------------------------

export type CheckInView = {
  checkIn: Omit<CheckInFull, "ratings">;
  scorecard: ScorecardWithContent;
  /** Ratings the viewer is allowed to see; null means hidden by blind scoring. */
  selfRatings: MeasureRating[] | null;
  managerRatings: MeasureRating[] | null;
  bothSubmitted: boolean;
  isSubject: boolean;
  isManager: boolean;
  canEditSelf: boolean;
  canEditManager: boolean;
  canMarkDiscussion: boolean;
  canAcknowledge: boolean;
};

export async function getCheckInView(
  checkInId: string,
  viewer: Viewer
): Promise<CheckInView> {
  const checkIn = await db.checkIn.findUnique({
    where: { id: checkInId },
    include: checkInInclude,
  });
  if (!checkIn) throw new CheckInError("Check-in not found.");

  const isSubject = viewer.id === checkIn.userId;
  const isManager = viewer.id === checkIn.managerId;
  if (!isSubject && !isManager && !(await canViewUser(viewer, checkIn.userId))) {
    throw new CheckInError("You do not have access to this check-in.");
  }
  if (!isSubject) {
    // POPIA access log: reading someone else's performance data.
    await db.accessLog.create({
      data: {
        viewerId: viewer.id,
        subjectUserId: checkIn.userId,
        entity: "check_in",
        entityId: checkIn.id,
      },
    });
  }

  const bothSubmitted =
    checkIn.selfSubmittedAt != null && checkIn.managerSubmittedAt != null;
  const { ratings, ...rest } = checkIn;
  const ofKind = (kind: RaterKind) => ratings.filter((r) => r.rater === kind);

  const selfVisible = isSubject || bothSubmitted;
  const managerVisible = isManager || bothSubmitted;
  const open = OPEN_STATUSES.includes(checkIn.status);

  return {
    checkIn: rest,
    scorecard: checkIn.scorecard,
    selfRatings: selfVisible ? ofKind("SELF") : null,
    managerRatings: managerVisible ? ofKind("MANAGER") : null,
    bothSubmitted,
    isSubject,
    isManager,
    canEditSelf: isSubject && open && checkIn.selfSubmittedAt == null,
    canEditManager: isManager && open && checkIn.managerSubmittedAt == null,
    canMarkDiscussion: isManager && checkIn.status === "AWAITING_DISCUSSION",
    canAcknowledge: isSubject && checkIn.status === "AWAITING_ACKNOWLEDGEMENT",
  };
}

// ---------------------------------------------------------------------------
// Drafts and submission
// ---------------------------------------------------------------------------

const ratingEntrySchema = z
  .object({
    measureId: z.uuid(),
    rating: z.number().int().min(1).max(5).nullable(),
    notApplicable: z.boolean(),
    naReason: z.string().trim().max(2000).nullable(),
    comment: z.string().trim().max(5000).nullable(),
  })
  .superRefine((r, ctx) => {
    if (r.notApplicable && r.rating != null) {
      ctx.addIssue({
        code: "custom",
        message: "A measure cannot be both rated and not applicable",
      });
    }
  });

export const selfDraftSchema = z.object({
  ratings: z.array(ratingEntrySchema),
  winOfWeek: z.string().trim().max(5000).nullable(),
  focusNextWeek: z.string().trim().max(5000).nullable(),
  inTheWay: z.string().trim().max(5000).nullable(),
  supportNeeded: z.string().trim().max(5000).nullable(),
});

export const managerDraftSchema = z.object({
  ratings: z.array(ratingEntrySchema),
  coachingNote: z.string().trim().max(5000).nullable(),
  agreedPriorities: z.string().trim().max(5000).nullable(),
});

export type SelfDraft = z.infer<typeof selfDraftSchema>;
export type ManagerDraft = z.infer<typeof managerDraftSchema>;

function measureIdsOf(checkIn: CheckInFull): Set<string> {
  return new Set(
    checkIn.scorecard.perspectives.flatMap((p) => p.measures.map((m) => m.id))
  );
}

async function upsertRatings(
  tx: Prisma.TransactionClient,
  checkIn: CheckInFull,
  rater: RaterKind,
  entries: SelfDraft["ratings"]
) {
  const valid = measureIdsOf(checkIn);
  for (const entry of entries) {
    if (!valid.has(entry.measureId)) {
      throw new CheckInError("A rating referenced a measure not on this scorecard.");
    }
    await tx.measureRating.upsert({
      where: {
        checkInId_measureId_rater: {
          checkInId: checkIn.id,
          measureId: entry.measureId,
          rater,
        },
      },
      update: {
        rating: entry.notApplicable ? null : entry.rating,
        notApplicable: entry.notApplicable,
        naReason: entry.notApplicable ? entry.naReason : null,
        comment: entry.comment,
      },
      create: {
        checkInId: checkIn.id,
        measureId: entry.measureId,
        rater,
        rating: entry.notApplicable ? null : entry.rating,
        notApplicable: entry.notApplicable,
        naReason: entry.notApplicable ? entry.naReason : null,
        comment: entry.comment,
      },
    });
  }
}

async function loadForEdit(checkInId: string): Promise<CheckInFull> {
  const checkIn = await db.checkIn.findUnique({
    where: { id: checkInId },
    include: checkInInclude,
  });
  if (!checkIn) throw new CheckInError("Check-in not found.");
  return checkIn;
}

async function transition(
  tx: Prisma.TransactionClient,
  checkIn: CheckIn,
  toStatus: CheckInStatus,
  actorId: string | null,
  extra?: Prisma.CheckInUpdateInput,
  note?: string
) {
  await tx.checkIn.update({
    where: { id: checkIn.id },
    data: { ...extra, status: toStatus },
  });
  await tx.checkInEvent.create({
    data: {
      checkInId: checkIn.id,
      fromStatus: checkIn.status,
      toStatus,
      actorId,
      note,
    },
  });
}

export async function saveSelfDraft(
  checkInId: string,
  viewer: Viewer,
  draft: SelfDraft
): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.userId) {
    throw new CheckInError("Only the person themselves can edit their self-rating.");
  }
  if (checkIn.selfSubmittedAt || !OPEN_STATUSES.includes(checkIn.status)) {
    throw new CheckInError("Your ratings are already submitted and locked.");
  }
  await db.$transaction(async (tx) => {
    await upsertRatings(tx, checkIn, "SELF", draft.ratings);
    const narrative = {
      winOfWeek: draft.winOfWeek,
      focusNextWeek: draft.focusNextWeek,
      inTheWay: draft.inTheWay,
      supportNeeded: draft.supportNeeded,
    };
    if (checkIn.status === "NOT_STARTED") {
      await transition(tx, checkIn, "SELF_IN_PROGRESS", viewer.id, narrative);
    } else {
      await tx.checkIn.update({ where: { id: checkIn.id }, data: narrative });
    }
  });
}

export async function saveManagerDraft(
  checkInId: string,
  viewer: Viewer,
  draft: ManagerDraft
): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.managerId) {
    throw new CheckInError("Only this person's manager can edit the manager rating.");
  }
  if (checkIn.managerSubmittedAt || !OPEN_STATUSES.includes(checkIn.status)) {
    throw new CheckInError("Your evaluation is already submitted and locked.");
  }
  await db.$transaction(async (tx) => {
    await upsertRatings(tx, checkIn, "MANAGER", draft.ratings);
    await tx.checkIn.update({
      where: { id: checkIn.id },
      data: {
        coachingNote: draft.coachingNote,
        agreedPriorities: draft.agreedPriorities,
      },
    });
  });
}

/**
 * Submission validation (brief §4/§6): every measure rated 1-5 or marked
 * not-applicable with a reason; comment REQUIRED at ratings 1, 2 and 5.
 * Returns human-readable problems keyed by measure code.
 */
export function validateForSubmit(
  checkIn: CheckInFull,
  rater: RaterKind
): string[] {
  const problems: string[] = [];
  const byMeasure = new Map(
    checkIn.ratings.filter((r) => r.rater === rater).map((r) => [r.measureId, r])
  );
  for (const p of checkIn.scorecard.perspectives) {
    for (const m of p.measures) {
      const r = byMeasure.get(m.id);
      if (!r || (r.rating == null && !r.notApplicable)) {
        problems.push(`${m.code} ${m.name}: needs a rating (or mark it not applicable).`);
        continue;
      }
      if (r.notApplicable && !r.naReason?.trim()) {
        problems.push(`${m.code} ${m.name}: "not applicable" needs a reason.`);
        continue;
      }
      if (
        r.rating != null &&
        [1, 2, 5].includes(r.rating) &&
        !r.comment?.trim()
      ) {
        problems.push(
          `${m.code} ${m.name}: a rating of ${r.rating} needs a comment.`
        );
      }
    }
  }
  return problems;
}

export async function submitSelf(checkInId: string, viewer: Viewer): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.userId) {
    throw new CheckInError("Only the person themselves can submit their self-rating.");
  }
  if (checkIn.selfSubmittedAt || !OPEN_STATUSES.includes(checkIn.status)) {
    throw new CheckInError("Already submitted.");
  }
  const problems = validateForSubmit(checkIn, "SELF");
  if (problems.length > 0) {
    throw new CheckInError(problems.join("\n"));
  }
  await db.$transaction(async (tx) => {
    const now = new Date();
    // Manager may have finished first; both in -> straight to discussion.
    const next = checkIn.managerSubmittedAt ? "AWAITING_DISCUSSION" : "AWAITING_MANAGER";
    await transition(tx, checkIn, next, viewer.id, { selfSubmittedAt: now });
  });
}

export async function submitManager(checkInId: string, viewer: Viewer): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.managerId) {
    throw new CheckInError("Only this person's manager can submit the evaluation.");
  }
  if (checkIn.managerSubmittedAt || !OPEN_STATUSES.includes(checkIn.status)) {
    throw new CheckInError("Already submitted.");
  }
  const problems = validateForSubmit(checkIn, "MANAGER");
  if (problems.length > 0) {
    throw new CheckInError(problems.join("\n"));
  }
  await db.$transaction(async (tx) => {
    const now = new Date();
    if (checkIn.selfSubmittedAt) {
      await transition(tx, checkIn, "AWAITING_DISCUSSION", viewer.id, {
        managerSubmittedAt: now,
      });
    } else {
      // Manager finished first: record it, but the week still waits on the
      // employee, and the manager still cannot see self-ratings.
      await tx.checkIn.update({
        where: { id: checkIn.id },
        data: { managerSubmittedAt: now },
      });
      await tx.checkInEvent.create({
        data: {
          checkInId: checkIn.id,
          fromStatus: checkIn.status,
          toStatus: checkIn.status,
          actorId: viewer.id,
          note: "Manager evaluation submitted before self-rating.",
        },
      });
    }
  });
}

export async function markDiscussionHeld(
  checkInId: string,
  viewer: Viewer
): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.managerId) {
    throw new CheckInError("Only the manager can mark the conversation as held.");
  }
  if (checkIn.status !== "AWAITING_DISCUSSION") {
    throw new CheckInError("Both sides need to be submitted first.");
  }
  await db.$transaction(async (tx) => {
    await transition(tx, checkIn, "AWAITING_ACKNOWLEDGEMENT", viewer.id, {
      discussionHeldAt: new Date(),
    });
  });
}

export async function acknowledge(checkInId: string, viewer: Viewer): Promise<void> {
  const checkIn = await loadForEdit(checkInId);
  if (viewer.id !== checkIn.userId) {
    throw new CheckInError("Only the person themselves can acknowledge.");
  }
  if (checkIn.status !== "AWAITING_ACKNOWLEDGEMENT") {
    throw new CheckInError("The conversation has to be marked as held first.");
  }
  await db.$transaction(async (tx) => {
    await transition(tx, checkIn, "COMPLETE", viewer.id, {
      acknowledgedAt: new Date(),
    });
  });
}

// ---------------------------------------------------------------------------
// Week close-out and reopen
// ---------------------------------------------------------------------------

/**
 * The scheduled Sunday 23:59 job (brief §5).
 *
 * "Missed" means the week did not happen: nobody rated anything. A week where
 * the ratings were done but the conversation or the acknowledgement was never
 * recorded is NOT a miss — the work was done — so its status is left where it
 * actually stopped and an event records that the week closed without a
 * close-out. Branding those weeks MISSED overstated absence, hid the real
 * bottleneck (the close-out step), and fed a false signal into participation
 * counts and the PIP trigger.
 */
export async function closeOutWeek(
  week: IsoWeek
): Promise<{ missed: number; notClosedOut: number }> {
  const candidates = await db.user.findMany({
    where: { isActive: true, managerId: { not: null } },
    select: { id: true, managerId: true },
  });
  let missed = 0;
  let notClosedOut = 0;
  for (const user of candidates) {
    const scorecard = await getLiveScorecard(user.id);
    if (!scorecard) continue;
    const existing = await db.checkIn.findUnique({
      where: {
        userId_isoYear_isoWeek_type: {
          userId: user.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          type: "WEEKLY",
        },
      },
    });
    if (!existing) {
      await db.checkIn.create({
        data: {
          userId: user.id,
          managerId: user.managerId!,
          scorecardId: scorecard.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          type: "WEEKLY",
          status: "MISSED",
          events: {
            create: { toStatus: "MISSED", note: "Week closed with no check-in." },
          },
        },
      });
      missed++;
    } else if (existing.status !== "COMPLETE" && existing.status !== "MISSED") {
      const ratedSomething =
        existing.selfSubmittedAt !== null || existing.managerSubmittedAt !== null;
      if (ratedSomething) {
        // Keep the status honest and leave the week actionable — a late
        // conversation and acknowledgement are still worth recording.
        await db.checkInEvent.create({
          data: {
            checkInId: existing.id,
            fromStatus: existing.status,
            toStatus: existing.status,
            actorId: null,
            note: "Week closed before the check-in was closed out.",
          },
        });
        notClosedOut++;
      } else {
        await db.$transaction(async (tx) => {
          await transition(tx, existing, "MISSED", null, {}, "Week closed with no ratings.");
        });
        missed++;
      }
    }
  }
  return { missed, notClosedOut };
}

/** Admin-only, logged: a missed week may be reopened, never quietly backfilled. */
export async function reopenMissed(
  checkInId: string,
  admin: Viewer,
  reason: string
): Promise<void> {
  if (admin.role !== "ADMIN") {
    throw new CheckInError("Only an admin can reopen a missed week.");
  }
  if (!reason.trim()) {
    throw new CheckInError("Reopening a missed week requires a reason.");
  }
  const checkIn = await loadForEdit(checkInId);
  if (checkIn.status !== "MISSED") {
    throw new CheckInError("Only missed check-ins can be reopened.");
  }
  // Restore the state implied by what was already submitted.
  const restored: CheckInStatus =
    checkIn.selfSubmittedAt && checkIn.managerSubmittedAt
      ? "AWAITING_DISCUSSION"
      : checkIn.selfSubmittedAt
        ? "AWAITING_MANAGER"
        : "SELF_IN_PROGRESS";
  await db.$transaction(async (tx) => {
    await transition(tx, checkIn, restored, admin.id, {}, `Reopened: ${reason}`);
    await tx.amendment.create({
      data: {
        entityType: "check_in",
        entityId: checkIn.id,
        field: "status",
        oldValue: "MISSED",
        newValue: restored,
        reason,
        changedById: admin.id,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Blockers
// ---------------------------------------------------------------------------

/**
 * Promote something raised in "what is in the way" to a tracked blocker
 * with an owner and a target date (brief §5 — this is what keeps the
 * team's faith in the tool).
 */
export async function promoteBlocker(opts: {
  checkInId: string;
  viewer: Viewer;
  description: string;
  ownerId: string;
  targetDate: Date | null;
}): Promise<void> {
  const checkIn = await loadForEdit(opts.checkInId);
  const allowed =
    opts.viewer.id === checkIn.managerId ||
    opts.viewer.id === checkIn.userId ||
    opts.viewer.role === "ADMIN";
  if (!allowed) {
    throw new CheckInError("You do not have access to this check-in.");
  }
  if (!opts.description.trim()) {
    throw new CheckInError("A blocker needs a description.");
  }
  const owner = await db.user.findUnique({ where: { id: opts.ownerId } });
  if (!owner || !owner.isActive) {
    throw new CheckInError("A blocker needs an active owner.");
  }
  await db.blocker.create({
    data: {
      userId: checkIn.userId,
      checkInId: checkIn.id,
      description: opts.description.trim(),
      ownerId: opts.ownerId,
      targetDate: opts.targetDate,
    },
  });
}

export async function setBlockerStatus(
  blockerId: string,
  viewer: Viewer,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DROPPED",
  resolution?: string
): Promise<void> {
  const blocker = await db.blocker.findUnique({ where: { id: blockerId } });
  if (!blocker) throw new CheckInError("Blocker not found.");
  const allowed =
    viewer.role === "ADMIN" ||
    viewer.id === blocker.ownerId ||
    viewer.id === blocker.userId ||
    (await canViewUser(viewer, blocker.userId));
  if (!allowed) throw new CheckInError("You do not have access to this blocker.");
  const closing = status === "RESOLVED" || status === "DROPPED";
  await db.blocker.update({
    where: { id: blockerId },
    data: {
      status,
      resolution: closing ? (resolution?.trim() || null) : null,
      resolvedAt: closing ? new Date() : null,
    },
  });
}
