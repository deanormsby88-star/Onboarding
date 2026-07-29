import { PrismaClient, type CheckInStatus } from "@prisma/client";

/**
 * Phase 4 seed (brief §11): 12 weeks of realistic history across demo users
 * with deliberate patterns baked in:
 *
 *  - Priya  — persistent POSITIVE DELTA (rates herself well above her manager)
 *  - Deon   — DECLINING over the period
 *  - Imka   — IMPROVING over the period
 *  - Misha  — MISSED WEEKS scattered through the period
 *  - Naledi — steady performer (humble self-rater)
 *  - Thabo  — steady middling performer
 *  - Gina   — GENEROUS manager (rates ~half a point high across the board)
 *  - Harold — HARSH manager (rates ~half a point low across the board)
 *
 * Deterministic (seeded PRNG), so re-running reproduces the same story.
 * All demo users use @demo.heya.team addresses and are recreated from
 * scratch on each run; real users are never touched.
 *
 * Run: npm run seed:history
 */

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260729);
const noise = (spread: number) => (rand() * 2 - 1) * spread;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

// ---------------------------------------------------------------------------
// ISO week helpers (duplicated from src/lib/weeks.ts to keep the seed
// runnable standalone via tsx without path-alias config)
// ---------------------------------------------------------------------------

type IsoWeek = { isoYear: number; isoWeek: number };
const DAY_MS = 86_400_000;

function isoWeekOf(date: Date): IsoWeek {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const isoYear = d.getUTCFullYear();
  const isoWeek = Math.ceil(
    ((d.getTime() - Date.UTC(isoYear, 0, 1)) / DAY_MS + 1) / 7
  );
  return { isoYear, isoWeek };
}
function weekStart({ isoYear, isoWeek }: IsoWeek): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * DAY_MS);
  return new Date(week1Monday.getTime() + (isoWeek - 1) * 7 * DAY_MS);
}
function weeksBack(n: number): IsoWeek[] {
  // n weeks, oldest first, ending with LAST week (the current week stays live).
  const out: IsoWeek[] = [];
  let cursor = isoWeekOf(new Date(Date.now() - 7 * DAY_MS + 2 * 3600_000));
  for (let i = 0; i < n; i++) {
    out.unshift(cursor);
    cursor = isoWeekOf(new Date(weekStart(cursor).getTime() - DAY_MS));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

const WEEKS = 12;

type Persona = {
  key: string;
  name: string;
  jobTitle: string;
  template: string;
  manager: "gina" | "harold";
  /** True performance at week 0 and at week 11 (linear in between). */
  baseStart: number;
  baseEnd: number;
  /** How far the self-rating sits above (+) or below (−) true performance. */
  selfDelta: number;
  /** 0-based indexes of missed weeks. */
  missedWeeks?: number[];
};

const MANAGER_BIAS: Record<"gina" | "harold", number> = {
  gina: 0.55, // generous
  harold: -0.55, // harsh
};

const PERSONAS: Persona[] = [
  {
    key: "priya",
    name: "Priya Naidoo (Demo)",
    jobTitle: "HR Administrator",
    template: "HR Administrator",
    manager: "harold",
    baseStart: 3.0,
    baseEnd: 3.0,
    selfDelta: 1.3, // the persistent positive delta
  },
  {
    key: "deon",
    name: "Deon van Wyk (Demo)",
    jobTitle: "Account Manager",
    template: "Account Manager",
    manager: "gina",
    baseStart: 4.1,
    baseEnd: 2.3, // declining
    selfDelta: 0.1,
  },
  {
    key: "imka",
    name: "Imka Botha (Demo)",
    jobTitle: "IT Technician",
    template: "IT Technician",
    manager: "harold",
    baseStart: 2.4,
    baseEnd: 4.2, // improving
    selfDelta: 0.2,
  },
  {
    key: "misha",
    name: "Misha Dlamini (Demo)",
    jobTitle: "Account Manager",
    template: "Account Manager",
    manager: "gina",
    baseStart: 3.2,
    baseEnd: 3.2,
    selfDelta: 0.3,
    missedWeeks: [1, 4, 5, 9],
  },
  {
    key: "naledi",
    name: "Naledi Mokoena (Demo)",
    jobTitle: "HR Administrator",
    template: "HR Administrator",
    manager: "gina",
    baseStart: 3.8,
    baseEnd: 3.9,
    selfDelta: -0.3, // humble
  },
  {
    key: "thabo",
    name: "Thabo Sithole (Demo)",
    jobTitle: "IT Technician",
    template: "IT Technician",
    manager: "harold",
    baseStart: 3.0,
    baseEnd: 3.1,
    selfDelta: 0.3,
  },
];

const WINS = [
  "Cleared the whole backlog before Thursday.",
  "Client meeting went better than expected.",
  "Got the new starter fully set up a day early.",
  "Sorted the reconciliation mess from last month.",
  "Handled a tough conversation without it escalating.",
];
const IN_THE_WAY = [
  "Waiting on IT for system access.",
  "Client keeps changing the reporting format.",
  "Too many interruptions to finish the audit file.",
  "Need sign-off from Finance before I can close this out.",
];
const COACH_NOTES = [
  "Keep the pace, watch the detail on the weekly file.",
  "Good week. Next week: fewer fires, more prevention.",
  "We talked about escalating earlier rather than absorbing.",
  "Agreed to block Friday mornings for the admin backlog.",
];
const LOW_COMMENTS = [
  "Missed the cut-off twice this week.",
  "Two errors found after submission; needs a second check.",
  "Slipped on the follow-ups; we discussed a checklist.",
];
const HIGH_COMMENTS = [
  "Genuinely exceptional week — carried the whole account.",
  "Set the standard here; others are copying the approach.",
];

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

async function main() {
  // Recreate demo users from scratch (never touches real records).
  const demoEmails = { contains: "@demo.heya.team" };
  const old = await db.user.findMany({ where: { email: demoEmails }, select: { id: true } });
  const oldIds = old.map((u) => u.id);
  if (oldIds.length > 0) {
    await db.accessLog.deleteMany({
      where: { OR: [{ viewerId: { in: oldIds } }, { subjectUserId: { in: oldIds } }] },
    });
    await db.blocker.deleteMany({
      where: { OR: [{ userId: { in: oldIds } }, { ownerId: { in: oldIds } }] },
    });
    await db.checkIn.deleteMany({ where: { userId: { in: oldIds } } });
    await db.scorecard.deleteMany({ where: { userId: { in: oldIds } } });
    await db.user.deleteMany({ where: { id: { in: oldIds } } });
  }

  const dean = await db.user.findUnique({ where: { email: "deano@heya.team" } });
  if (!dean) throw new Error("Run `npm run seed` first (needs Dean as admin).");

  const gina = await db.user.create({
    data: {
      email: "gina.demo@demo.heya.team",
      name: "Gina Pillay (Demo)",
      jobTitle: "Account Manager",
      role: "MANAGER",
      managerId: dean.id,
    },
  });
  const harold = await db.user.create({
    data: {
      email: "harold.demo@demo.heya.team",
      name: "Harold Kruger (Demo)",
      jobTitle: "Account Manager",
      role: "MANAGER",
      managerId: dean.id,
    },
  });
  const managers = { gina, harold };

  const weeks = weeksBack(WEEKS);
  const firstMonday = weekStart(weeks[0]!);

  for (const persona of PERSONAS) {
    const managerUser = managers[persona.manager];
    const user = await db.user.create({
      data: {
        email: `${persona.key}.demo@demo.heya.team`,
        name: persona.name,
        jobTitle: persona.jobTitle,
        role: "EMPLOYEE",
        managerId: managerUser.id,
      },
    });

    // Copy the role template into scorecard v1, effective before week 1.
    const template = await db.scorecardTemplate.findFirst({
      where: { name: persona.template },
      include: {
        perspectives: {
          orderBy: { sortOrder: "asc" },
          include: { measures: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    if (!template) throw new Error(`Template missing: ${persona.template} — run npm run seed`);
    const scorecard = await db.scorecard.create({
      data: {
        userId: user.id,
        templateId: template.id,
        version: 1,
        effectiveFrom: new Date(firstMonday.getTime() - 7 * DAY_MS),
        createdById: dean.id,
        perspectives: {
          create: template.perspectives.map((p) => ({
            kind: p.kind,
            weightPct: p.weightPct,
            sortOrder: p.sortOrder,
            measures: {
              create: p.measures.map((m) => ({
                code: m.code,
                name: m.name,
                definition: m.definition,
                anchor3: m.anchor3,
                weight: m.weight,
                sortOrder: m.sortOrder,
              })),
            },
          })),
        },
      },
      include: { perspectives: { include: { measures: true } } },
    });
    const measures = scorecard.perspectives.flatMap((p) => p.measures);

    for (const [wi, week] of weeks.entries()) {
      const monday = weekStart(week);
      const at = (day: number, hour: number) =>
        new Date(monday.getTime() + day * DAY_MS + hour * 3600_000);

      if (persona.missedWeeks?.includes(wi)) {
        await db.checkIn.create({
          data: {
            userId: user.id,
            managerId: managerUser.id,
            scorecardId: scorecard.id,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
            type: "WEEKLY",
            status: "MISSED",
            createdAt: at(6, 22),
            events: {
              create: {
                toStatus: "MISSED",
                note: "Week closed with no check-in.",
                at: at(6, 22),
              },
            },
          },
        });
        continue;
      }

      const progress = wi / (WEEKS - 1);
      const base = persona.baseStart + (persona.baseEnd - persona.baseStart) * progress;

      const status: CheckInStatus = "COMPLETE";
      const selfAt = at(3, 14 + rand() * 3); // Thursday afternoon
      const mgrAt = at(4, 9 + rand() * 3); // Friday morning
      const discussAt = at(4, 14 + rand()); // Friday afternoon
      const ackAt = at(4, 15 + rand());

      const checkIn = await db.checkIn.create({
        data: {
          userId: user.id,
          managerId: managerUser.id,
          scorecardId: scorecard.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          type: "WEEKLY",
          status,
          winOfWeek: rand() < 0.8 ? pick(WINS) : null,
          focusNextWeek: rand() < 0.6 ? "Stay on top of the weekly file." : null,
          inTheWay: rand() < 0.35 ? pick(IN_THE_WAY) : null,
          supportNeeded: rand() < 0.2 ? "Time with my manager on priorities." : null,
          coachingNote: pick(COACH_NOTES),
          agreedPriorities: rand() < 0.7 ? "Agreed in Friday's conversation." : null,
          selfSubmittedAt: selfAt,
          managerSubmittedAt: mgrAt,
          discussionHeldAt: discussAt,
          acknowledgedAt: ackAt,
          createdAt: at(3, 13),
          events: {
            create: [
              { toStatus: "NOT_STARTED", at: at(3, 13) },
              { toStatus: "SELF_IN_PROGRESS", actorId: user.id, at: at(3, 13.5) },
              { fromStatus: "SELF_IN_PROGRESS", toStatus: "AWAITING_MANAGER", actorId: user.id, at: selfAt },
              { fromStatus: "AWAITING_MANAGER", toStatus: "AWAITING_DISCUSSION", actorId: managerUser.id, at: mgrAt },
              { fromStatus: "AWAITING_DISCUSSION", toStatus: "AWAITING_ACKNOWLEDGEMENT", actorId: managerUser.id, at: discussAt },
              { fromStatus: "AWAITING_ACKNOWLEDGEMENT", toStatus: "COMPLETE", actorId: user.id, at: ackAt },
            ],
          },
        },
      });

      for (const m of measures) {
        const trueLevel = base + noise(0.55);
        const selfRating = clamp(trueLevel + persona.selfDelta + noise(0.4));
        const mgrRating = clamp(trueLevel + MANAGER_BIAS[persona.manager] + noise(0.4));
        const na = rand() < 0.02;

        const commentFor = (r: number, who: "self" | "mgr") => {
          if (r <= 2) return pick(LOW_COMMENTS);
          if (r === 5) return pick(HIGH_COMMENTS);
          return rand() < (who === "mgr" ? 0.15 : 0.1)
            ? "Steady week on this one."
            : null;
        };

        await db.measureRating.createMany({
          data: [
            {
              checkInId: checkIn.id,
              measureId: m.id,
              rater: "SELF",
              rating: na ? null : selfRating,
              notApplicable: na,
              naReason: na ? "Nothing in this area landed on my desk this week." : null,
              comment: na ? null : commentFor(selfRating, "self"),
              createdAt: selfAt,
              updatedAt: selfAt,
            },
            {
              checkInId: checkIn.id,
              measureId: m.id,
              rater: "MANAGER",
              rating: na ? null : mgrRating,
              notApplicable: na,
              naReason: na ? "Agreed — not applicable this week." : null,
              comment: na ? null : commentFor(mgrRating, "mgr"),
              createdAt: mgrAt,
              updatedAt: mgrAt,
            },
          ],
        });
      }

      // Blockers: promote some of the "in the way" items; leave a couple open.
      if (checkIn.inTheWay && rand() < 0.5) {
        const resolved = rand() < 0.6;
        await db.blocker.create({
          data: {
            userId: user.id,
            checkInId: checkIn.id,
            description: checkIn.inTheWay,
            ownerId: rand() < 0.5 ? managerUser.id : dean.id,
            targetDate: at(11, 0), // next-week Thursday
            status: resolved ? "RESOLVED" : "OPEN",
            resolution: resolved ? "Sorted with the owner." : null,
            resolvedAt: resolved ? at(9, 12) : null,
            createdAt: discussAt,
          },
        });
      }
    }
    console.log(`Seeded 12 weeks for ${persona.name}`);
  }

  console.log("Demo history seeded: 2 managers, 6 employees, 12 weeks.");
}

main().finally(() => db.$disconnect());
