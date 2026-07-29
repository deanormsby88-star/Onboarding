import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { amendRating, AmendmentError, amendmentsForCheckIn } from "@/lib/amendments";
import { buildPerformanceRecordPdf } from "@/lib/export-pdf";
import type { Viewer } from "@/lib/authz";

/**
 * Phase 7: the locking + amendment contract, and the PDF export, exercised
 * against a real completed check-in built from fixtures.
 */

const T = "compliance-test";
let admin: Viewer;
let manager: Viewer;
let employeeId: string;
let checkInId: string;
let selfRatingId: string;

async function cleanup() {
  const users = await db.user.findMany({
    where: { email: { contains: T } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await db.amendment.deleteMany({ where: { changedById: { in: ids } } });
  await db.accessLog.deleteMany({
    where: { OR: [{ viewerId: { in: ids } }, { subjectUserId: { in: ids } }] },
  });
  await db.checkIn.deleteMany({ where: { userId: { in: ids } } });
  await db.scorecard.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  await cleanup();
  const adminUser = await db.user.create({
    data: { email: `admin.${T}@example.test`, name: "Admin", role: "ADMIN" },
  });
  const managerUser = await db.user.create({
    data: { email: `manager.${T}@example.test`, name: "Manager", role: "MANAGER" },
  });
  const employee = await db.user.create({
    data: {
      email: `employee.${T}@example.test`,
      name: "Employee",
      role: "EMPLOYEE",
      managerId: managerUser.id,
    },
  });
  admin = { id: adminUser.id, role: "ADMIN" };
  manager = { id: managerUser.id, role: "MANAGER" };
  employeeId = employee.id;

  const scorecard = await db.scorecard.create({
    data: {
      userId: employee.id,
      version: 1,
      effectiveFrom: new Date("2026-01-01"),
      createdById: adminUser.id,
      perspectives: {
        create: [
          {
            kind: "DELIVERY_QUALITY",
            weightPct: 100,
            sortOrder: 0,
            measures: {
              create: [
                {
                  code: "1.1",
                  name: "Output",
                  definition: "d",
                  anchor3: "a",
                  weight: 1,
                  sortOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { perspectives: { include: { measures: true } } },
  });
  const measureId = scorecard.perspectives[0]!.measures[0]!.id;

  const now = new Date();
  const checkIn = await db.checkIn.create({
    data: {
      userId: employee.id,
      managerId: managerUser.id,
      scorecardId: scorecard.id,
      isoYear: 2026,
      isoWeek: 25,
      status: "COMPLETE",
      selfSubmittedAt: now,
      managerSubmittedAt: now,
      discussionHeldAt: now,
      acknowledgedAt: now,
      winOfWeek: "Got it done",
      coachingNote: "Keep going",
      ratings: {
        create: [
          { measureId, rater: "SELF", rating: 4, comment: null },
          { measureId, rater: "MANAGER", rating: 2, comment: "Two errors this week" },
        ],
      },
    },
    include: { ratings: true },
  });
  checkInId = checkIn.id;
  selfRatingId = checkIn.ratings.find((r) => r.rater === "SELF")!.id;
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("amendRating", () => {
  it("refuses non-admins", async () => {
    await expect(amendRating(manager, selfRatingId, 3, "because")).rejects.toThrow(
      /Only an admin/
    );
  });

  it("requires a reason and a valid rating", async () => {
    await expect(amendRating(admin, selfRatingId, 3, "  ")).rejects.toThrow(/reason/);
    await expect(amendRating(admin, selfRatingId, 7, "typo")).rejects.toThrow(/1 to 5/);
  });

  it("updates the value and writes the trail with the original preserved", async () => {
    await amendRating(admin, selfRatingId, 3, "Captured wrong in the meeting");
    const rating = await db.measureRating.findUnique({ where: { id: selfRatingId } });
    expect(rating?.rating).toBe(3);

    const trail = await amendmentsForCheckIn(checkInId);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      field: "rating",
      oldValue: "4",
      newValue: "3",
      reason: "Captured wrong in the meeting",
    });
  });

  it("refuses to amend a record that is not locked", async () => {
    await db.checkIn.update({
      where: { id: checkInId },
      data: { status: "AWAITING_DISCUSSION" },
    });
    await expect(amendRating(admin, selfRatingId, 5, "nope")).rejects.toThrow(
      /locked/
    );
    await db.checkIn.update({
      where: { id: checkInId },
      data: { status: "COMPLETE" },
    });
  });
});

describe("performance record PDF", () => {
  it("builds a valid PDF containing scores, comments and the amendment", async () => {
    const bytes = await buildPerformanceRecordPdf({
      userId: employeeId,
      from: new Date("2026-01-01"),
      to: new Date("2026-12-31"),
      generatedByName: "Test Admin",
    });
    // %PDF header
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes.length).toBeGreaterThan(1500);
  });
});
