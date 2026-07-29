import { z } from "zod";
import { db } from "@/lib/db";
import { getLiveScorecard } from "@/lib/scorecards";
import type { Viewer } from "@/lib/authz";

/**
 * PIP module (brief §8). Built for the Code of Good Practice: Dismissal —
 * the record must show the employee knew the standard, had a fair
 * opportunity to meet it, and was given appropriate support. Everything
 * here is admin-only (capability table §3) and links back to actual
 * scorecard measures and check-ins so the evidence chain is unbroken.
 */

export class PipError extends Error {}

export const pipCreateSchema = z.object({
  userId: z.uuid(),
  standardRequired: z
    .string()
    .trim()
    .min(20, "State the required standard explicitly — this is the heart of the record."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date required"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  measures: z
    .array(
      z.object({
        measureId: z.uuid(),
        shortfall: z.string().trim().min(5, "Describe the shortfall on each measure."),
      })
    )
    .min(1, "Link at least one scorecard measure that is falling short."),
});

export async function createPip(
  admin: Viewer,
  input: z.infer<typeof pipCreateSchema>
) {
  if (admin.role !== "ADMIN") throw new PipError("Only an admin can initiate a PIP.");
  const scorecard = await getLiveScorecard(input.userId);
  if (!scorecard) {
    throw new PipError("This person has no live scorecard to measure against.");
  }
  const validMeasures = new Set(
    scorecard.perspectives.flatMap((p) => p.measures.map((m) => m.id))
  );
  for (const m of input.measures) {
    if (!validMeasures.has(m.measureId)) {
      throw new PipError("A linked measure is not on this person's live scorecard.");
    }
  }
  return db.pip.create({
    data: {
      userId: input.userId,
      openedById: admin.id,
      status: "ACTIVE",
      standardRequired: input.standardRequired,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
      measures: { create: input.measures },
    },
  });
}

export async function addSupportAction(
  admin: Viewer,
  pipId: string,
  input: { type: "TRAINING" | "GUIDANCE" | "COUNSELLING" | "OTHER"; description: string; providedAt: string }
) {
  if (admin.role !== "ADMIN") throw new PipError("Only an admin can record support.");
  if (!input.description.trim()) throw new PipError("Describe the support provided.");
  return db.pipSupportAction.create({
    data: {
      pipId,
      type: input.type,
      description: input.description.trim(),
      providedAt: new Date(`${input.providedAt}T00:00:00.000Z`),
    },
  });
}

export async function addPipReview(
  admin: Viewer,
  pipId: string,
  input: { reviewDate: string; outcome: string; checkInId?: string | null }
) {
  if (admin.role !== "ADMIN") throw new PipError("Only an admin can record a review.");
  if (!input.outcome.trim()) throw new PipError("Record the outcome of the review.");
  if (input.checkInId) {
    const pip = await db.pip.findUnique({ where: { id: pipId } });
    const checkIn = await db.checkIn.findUnique({ where: { id: input.checkInId } });
    if (!pip || !checkIn || checkIn.userId !== pip.userId) {
      throw new PipError("That check-in does not belong to this person.");
    }
    // Keep the evidence chain: the check-in is tagged as a PIP review.
    await db.checkIn.update({
      where: { id: checkIn.id },
      data: { pipId },
    });
  }
  return db.pipReview.create({
    data: {
      pipId,
      checkInId: input.checkInId || null,
      reviewDate: new Date(`${input.reviewDate}T00:00:00.000Z`),
      outcome: input.outcome.trim(),
    },
  });
}

export async function closePip(
  admin: Viewer,
  pipId: string,
  input: { finalOutcome: string; outcomeReasoning: string }
) {
  if (admin.role !== "ADMIN") throw new PipError("Only an admin can close a PIP.");
  if (!input.finalOutcome.trim() || !input.outcomeReasoning.trim()) {
    throw new PipError("A closed PIP needs both the final outcome and the reasoning.");
  }
  return db.pip.update({
    where: { id: pipId },
    data: {
      status: "CLOSED",
      finalOutcome: input.finalOutcome.trim(),
      outcomeReasoning: input.outcomeReasoning.trim(),
      closedAt: new Date(),
    },
  });
}

export const pipInclude = {
  user: { select: { id: true, name: true } },
  openedBy: { select: { name: true } },
  measures: { include: { measure: { select: { code: true, name: true, anchor3: true } } } },
  supportActions: { orderBy: { providedAt: "asc" as const } },
  reviews: {
    orderBy: { reviewDate: "asc" as const },
    include: { checkIn: { select: { id: true, isoYear: true, isoWeek: true } } },
  },
};
