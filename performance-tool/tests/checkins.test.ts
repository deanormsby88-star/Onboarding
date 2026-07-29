import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  acknowledge,
  CheckInError,
  closeOutWeek,
  getCheckInView,
  getOrCreateWeeklyCheckIn,
  markDiscussionHeld,
  promoteBlocker,
  reopenMissed,
  saveManagerDraft,
  saveSelfDraft,
  submitManager,
  submitSelf,
  type SelfDraft,
} from "@/lib/checkins";
import { assignTemplateToUser, saveTemplate } from "@/lib/scorecards";
import type { Viewer } from "@/lib/authz";

const T = "checkin-test";
const WEEK = { isoYear: 2026, isoWeek: 30 };

let employee: Viewer & { name: string };
let manager: Viewer & { name: string };
let admin: Viewer & { name: string };
let outsider: Viewer & { name: string };
let measureIds: string[] = [];

async function cleanup() {
  const users = await db.user.findMany({
    where: { email: { contains: T } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  await db.accessLog.deleteMany({
    where: { OR: [{ viewerId: { in: userIds } }, { subjectUserId: { in: userIds } }] },
  });
  await db.amendment.deleteMany({ where: { changedById: { in: userIds } } });
  await db.blocker.deleteMany({ where: { userId: { in: userIds } } });
  await db.checkIn.deleteMany({ where: { userId: { in: userIds } } });
  await db.scorecard.deleteMany({ where: { userId: { in: userIds } } });
  await db.scorecardTemplate.deleteMany({ where: { name: { contains: T } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}

beforeAll(async () => {
  await cleanup();
  const mkUser = async (key: string, role: "EMPLOYEE" | "MANAGER" | "ADMIN", managerId?: string) => {
    const u = await db.user.create({
      data: {
        email: `${key}.${T}@example.test`,
        name: key,
        role,
        managerId: managerId ?? null,
      },
    });
    return { id: u.id, role, name: u.name };
  };
  admin = await mkUser("admin", "ADMIN");
  manager = await mkUser("manager", "MANAGER");
  employee = await mkUser("employee", "EMPLOYEE", manager.id);
  outsider = await mkUser("outsider", "EMPLOYEE", manager.id);

  const templateId = await saveTemplate(null, {
    name: `${T}-template`,
    description: "",
    perspectives: (
      [
        ["DELIVERY_QUALITY", 40],
        ["CLIENT_STAKEHOLDER", 20],
        ["COMMERCIAL_EFFICIENCY", 15],
        ["PEOPLE_GROWTH", 25],
      ] as const
    ).map(([kind, weightPct]) => ({
      kind,
      weightPct,
      measures: [
        { code: "a", name: "A", definition: "d", anchor3: "x", weight: 1 },
        { code: "b", name: "B", definition: "d", anchor3: "x", weight: 1 },
      ],
    })),
  });
  const scorecard = await assignTemplateToUser({
    userId: employee.id,
    templateId,
    effectiveFrom: new Date("2026-01-01"),
    actorId: admin.id,
  });
  const full = await db.scorecard.findUnique({
    where: { id: scorecard.id },
    include: { perspectives: { include: { measures: true } } },
  });
  measureIds = full!.perspectives.flatMap((p) => p.measures.map((m) => m.id));
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

function fullDraft(rating: number, comment?: string): SelfDraft {
  return {
    ratings: measureIds.map((measureId) => ({
      measureId,
      rating,
      notApplicable: false,
      naReason: null,
      comment: comment ?? null,
    })),
    winOfWeek: "Shipped the thing",
    focusNextWeek: null,
    inTheWay: "Waiting on IT for access",
    supportNeeded: null,
  };
}

describe("check-in lifecycle", () => {
  it("cannot create a check-in without a scorecard", async () => {
    await expect(getOrCreateWeeklyCheckIn(outsider.id, WEEK)).rejects.toThrow(
      /No scorecard/
    );
  });

  it("creates once and reuses thereafter", async () => {
    const first = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    const again = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    expect(first.id).toBe(again.id);
    expect(first.status).toBe("NOT_STARTED");
    expect(first.managerId).toBe(manager.id);
  });

  it("saving a self draft moves to SELF_IN_PROGRESS", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await saveSelfDraft(ci.id, employee, fullDraft(3));
    const view = await getCheckInView(ci.id, employee);
    expect(view.checkIn.status).toBe("SELF_IN_PROGRESS");
    expect(view.checkIn.winOfWeek).toBe("Shipped the thing");
  });

  it("only the subject can edit the self side", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await expect(saveSelfDraft(ci.id, manager, fullDraft(5))).rejects.toThrow(
      /Only the person themselves/
    );
  });

  it("submit blocks a rating of 5 without a comment", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await saveSelfDraft(ci.id, employee, fullDraft(5));
    await expect(submitSelf(ci.id, employee)).rejects.toThrow(/needs a comment/);
  });

  it("submit blocks N/A without a reason", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    const draft = fullDraft(3);
    draft.ratings[0] = {
      measureId: measureIds[0]!,
      rating: null,
      notApplicable: true,
      naReason: null,
      comment: null,
    };
    await saveSelfDraft(ci.id, employee, draft);
    await expect(submitSelf(ci.id, employee)).rejects.toThrow(/needs a reason/);
  });

  it("valid submit locks the self side and awaits the manager", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await saveSelfDraft(ci.id, employee, fullDraft(3));
    await submitSelf(ci.id, employee);
    const view = await getCheckInView(ci.id, employee);
    expect(view.checkIn.status).toBe("AWAITING_MANAGER");
    expect(view.canEditSelf).toBe(false);
    await expect(saveSelfDraft(ci.id, employee, fullDraft(4))).rejects.toThrow(
      /locked/
    );
  });

  it("BLIND: the manager cannot see self-ratings before submitting their own", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    const view = await getCheckInView(ci.id, manager);
    expect(view.selfRatings).toBeNull();
    expect(view.managerRatings).not.toBeNull();
  });

  it("BLIND: the employee cannot see manager ratings before both submitted", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await saveManagerDraft(ci.id, manager, {
      ratings: measureIds.map((measureId) => ({
        measureId,
        rating: 2,
        notApplicable: false,
        naReason: null,
        comment: "Needs to slow down and check the work",
      })),
      coachingNote: "Deliberate pace this week",
      agreedPriorities: null,
    });
    const view = await getCheckInView(ci.id, employee);
    expect(view.managerRatings).toBeNull();
  });

  it("manager submit reveals both sides and moves to AWAITING_DISCUSSION", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await submitManager(ci.id, manager);
    const asManager = await getCheckInView(ci.id, manager);
    expect(asManager.checkIn.status).toBe("AWAITING_DISCUSSION");
    expect(asManager.selfRatings).not.toBeNull();
    const asEmployee = await getCheckInView(ci.id, employee);
    expect(asEmployee.managerRatings).not.toBeNull();
  });

  it("discussion then acknowledgement completes and locks the record", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await expect(acknowledge(ci.id, employee)).rejects.toThrow(/marked as held/);
    await expect(markDiscussionHeld(ci.id, employee)).rejects.toThrow(
      /Only the manager/
    );
    await markDiscussionHeld(ci.id, manager);
    await expect(markDiscussionHeld(ci.id, manager)).rejects.toThrow(CheckInError);
    await acknowledge(ci.id, employee);
    const view = await getCheckInView(ci.id, employee);
    expect(view.checkIn.status).toBe("COMPLETE");
    expect(view.canEditSelf).toBe(false);
    expect(view.canEditManager).toBe(false);
  });

  it("records every status transition with its actor", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    const events = await db.checkInEvent.findMany({
      where: { checkInId: ci.id },
      orderBy: { at: "asc" },
    });
    const path = events.map((e) => e.toStatus);
    expect(path).toEqual([
      "NOT_STARTED",
      "SELF_IN_PROGRESS",
      "AWAITING_MANAGER",
      "AWAITING_DISCUSSION",
      "AWAITING_ACKNOWLEDGEMENT",
      "COMPLETE",
    ]);
    // Every transition after creation carries its acting user.
    expect(events.slice(1).every((e) => e.actorId)).toBe(true);
  });

  it("a peer's record is not viewable, and manager views are access-logged", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await expect(getCheckInView(ci.id, outsider)).rejects.toThrow(/access/);
    const logs = await db.accessLog.findMany({
      where: { viewerId: manager.id, subjectUserId: employee.id, entity: "check_in" },
    });
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe("blockers", () => {
  it("promotes what's in the way to a tracked blocker with an owner", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    await promoteBlocker({
      checkInId: ci.id,
      viewer: manager,
      description: "Waiting on IT for access",
      ownerId: manager.id,
      targetDate: new Date("2026-08-07"),
    });
    const blockers = await db.blocker.findMany({ where: { checkInId: ci.id } });
    expect(blockers).toHaveLength(1);
    expect(blockers[0]?.ownerId).toBe(manager.id);
    expect(blockers[0]?.status).toBe("OPEN");
  });
});

describe("week close-out and reopen", () => {
  const CLOSE_WEEK = { isoYear: 2026, isoWeek: 29 };

  it("marks untouched people as MISSED and completed weeks stay complete", async () => {
    const { missed } = await closeOutWeek(CLOSE_WEEK);
    expect(missed).toBeGreaterThanOrEqual(1); // employee had no week-29 check-in
    const ci = await db.checkIn.findUnique({
      where: {
        userId_isoYear_isoWeek_type: {
          userId: employee.id,
          isoYear: CLOSE_WEEK.isoYear,
          isoWeek: CLOSE_WEEK.isoWeek,
          type: "WEEKLY",
        },
      },
    });
    expect(ci?.status).toBe("MISSED");

    // Week 30 was completed above; closing it changes nothing.
    await closeOutWeek(WEEK);
    const done = await getOrCreateWeeklyCheckIn(employee.id, WEEK);
    expect(done.status).toBe("COMPLETE");
  });

  it("missed weeks cannot be edited", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, CLOSE_WEEK);
    await expect(saveSelfDraft(ci.id, employee, fullDraft(3))).rejects.toThrow(
      CheckInError
    );
  });

  it("reopen is admin-only, needs a reason, and writes the amendment trail", async () => {
    const ci = await getOrCreateWeeklyCheckIn(employee.id, CLOSE_WEEK);
    await expect(reopenMissed(ci.id, manager, "please")).rejects.toThrow(
      /Only an admin/
    );
    await expect(reopenMissed(ci.id, admin, "  ")).rejects.toThrow(/reason/);
    await reopenMissed(ci.id, admin, "Employee was on approved leave");
    const reopened = await db.checkIn.findUnique({ where: { id: ci.id } });
    expect(reopened?.status).toBe("SELF_IN_PROGRESS");
    const amendments = await db.amendment.findMany({
      where: { entityType: "check_in", entityId: ci.id },
    });
    expect(amendments).toHaveLength(1);
    expect(amendments[0]?.oldValue).toBe("MISSED");
  });
});
