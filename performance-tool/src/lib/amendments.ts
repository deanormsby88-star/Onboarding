import { db } from "@/lib/db";
import type { Viewer } from "@/lib/authz";

/**
 * Post-lock corrections (brief §8). A completed check-in is never edited
 * silently: an admin amendment updates the value AND writes an amendment
 * row (old value, new value, mandatory reason, who) which is displayed on
 * the record itself. The original value is preserved in the trail.
 */

export class AmendmentError extends Error {}

export async function amendRating(
  admin: Viewer,
  ratingId: string,
  newRating: number,
  reason: string
): Promise<void> {
  if (admin.role !== "ADMIN") {
    throw new AmendmentError("Only an admin can amend a locked record.");
  }
  if (!reason.trim()) {
    throw new AmendmentError("An amendment requires a reason.");
  }
  if (!Number.isInteger(newRating) || newRating < 1 || newRating > 5) {
    throw new AmendmentError("The rating must be a whole number from 1 to 5.");
  }
  const rating = await db.measureRating.findUnique({
    where: { id: ratingId },
    include: { checkIn: { select: { status: true } } },
  });
  if (!rating) throw new AmendmentError("Rating not found.");
  if (rating.checkIn.status !== "COMPLETE") {
    throw new AmendmentError(
      "Amendments are for locked records. Open weeks are edited normally."
    );
  }
  if (rating.rating === newRating) {
    throw new AmendmentError("That is already the recorded rating.");
  }
  await db.$transaction([
    db.measureRating.update({
      where: { id: ratingId },
      data: { rating: newRating, notApplicable: false, naReason: null },
    }),
    db.amendment.create({
      data: {
        entityType: "measure_rating",
        entityId: ratingId,
        field: "rating",
        oldValue: rating.notApplicable ? "N/A" : String(rating.rating),
        newValue: String(newRating),
        reason: reason.trim(),
        changedById: admin.id,
      },
    }),
  ]);
}

/** All amendments touching a check-in (its own rows and its ratings'). */
export async function amendmentsForCheckIn(checkInId: string) {
  const ratingIds = (
    await db.measureRating.findMany({
      where: { checkInId },
      select: { id: true },
    })
  ).map((r) => r.id);
  return db.amendment.findMany({
    where: {
      OR: [
        { entityType: "check_in", entityId: checkInId },
        { entityType: "measure_rating", entityId: { in: ratingIds } },
      ],
    },
    include: { changedBy: { select: { name: true } } },
    orderBy: { changedAt: "asc" },
  });
}
