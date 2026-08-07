import type { CheckInStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { PERSPECTIVE_LABEL, PERSPECTIVE_ORDER } from "@/lib/scorecards";
import { overallScore, perspectiveScore, ratingsToMap } from "@/lib/scoring";
import { weekLabel } from "@/lib/weeks";

/**
 * Analytics (brief §9). All functions assume the CALLER has already
 * authorised the viewer for the subject(s) — routes go through
 * assertCanViewUser / requireAdmin first. Scores only ever come from
 * check-ins where BOTH sides are submitted; blind weeks contribute nothing.
 */

const checkInWithScores = {
  ratings: true,
  scorecard: {
    include: {
      perspectives: {
        orderBy: { sortOrder: "asc" as const },
        include: { measures: { orderBy: { sortOrder: "asc" as const } } },
      },
    },
  },
};

type ScoredCheckIn = NonNullable<
  Awaited<ReturnType<typeof fetchScoredCheckIns>>
>[number];

async function fetchScoredCheckIns(userId: string) {
  return db.checkIn.findMany({
    where: { userId, type: "WEEKLY" },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
    include: checkInWithScores,
  });
}

function computeOveralls(checkIn: ScoredCheckIn): {
  self: number | null;
  manager: number | null;
} {
  const both = checkIn.selfSubmittedAt && checkIn.managerSubmittedAt;
  if (!both) return { self: null, manager: null };
  const perspectives = checkIn.scorecard.perspectives.map((p) => ({
    id: p.id,
    weightPct: p.weightPct,
  }));
  const byPerspective = new Map(
    checkIn.scorecard.perspectives.map((p) => [
      p.id,
      p.measures.map((m) => ({ id: m.id, weight: m.weight, perspectiveId: p.id })),
    ])
  );
  const mapOf = (rater: "SELF" | "MANAGER") =>
    ratingsToMap(
      checkIn.ratings
        .filter((r) => r.rater === rater)
        .map((r) => ({ measureId: r.measureId, rating: r.rating }))
    );
  return {
    self: overallScore(perspectives, byPerspective, mapOf("SELF")),
    manager: overallScore(perspectives, byPerspective, mapOf("MANAGER")),
  };
}

// ---------------------------------------------------------------------------
// Individual view
// ---------------------------------------------------------------------------

export type WeekPoint = {
  week: string; // "2026-W31"
  self: number | null;
  manager: number | null;
  delta: number | null;
  status: CheckInStatus;
};

export type Participation = {
  completed: number;
  missed: number;
  total: number;
  currentStreak: number; // consecutive completed weeks, counting backwards
};

export type IndividualAnalytics = {
  points: WeekPoint[];
  participation: Participation;
  /** Latest fully-submitted week, by perspective. */
  perspectives: { name: string; self: number | null; manager: number | null }[];
};

export async function individualAnalytics(
  userId: string
): Promise<IndividualAnalytics> {
  const checkIns = await fetchScoredCheckIns(userId);

  const points: WeekPoint[] = checkIns.map((c) => {
    const { self, manager } = computeOveralls(c);
    return {
      week: weekLabel({ isoYear: c.isoYear, isoWeek: c.isoWeek }),
      self,
      manager,
      delta: self != null && manager != null ? self - manager : null,
      status: c.status,
    };
  });

  let currentStreak = 0;
  for (let i = checkIns.length - 1; i >= 0; i--) {
    if (checkIns[i]!.status === "COMPLETE") currentStreak++;
    else break;
  }
  const participation: Participation = {
    completed: checkIns.filter((c) => c.status === "COMPLETE").length,
    missed: checkIns.filter((c) => c.status === "MISSED").length,
    total: checkIns.length,
    currentStreak,
  };

  const latest = [...checkIns]
    .reverse()
    .find((c) => c.selfSubmittedAt && c.managerSubmittedAt);
  const perspectives = latest
    ? PERSPECTIVE_ORDER.flatMap((kind) => {
        const p = latest.scorecard.perspectives.find((x) => x.kind === kind);
        if (!p) return [];
        const defs = p.measures.map((m) => ({
          id: m.id,
          weight: m.weight,
          perspectiveId: p.id,
        }));
        const mapOf = (rater: "SELF" | "MANAGER") =>
          ratingsToMap(
            latest.ratings
              .filter((r) => r.rater === rater)
              .map((r) => ({ measureId: r.measureId, rating: r.rating }))
          );
        return [
          {
            name: PERSPECTIVE_LABEL[kind],
            self: perspectiveScore(defs, mapOf("SELF")),
            manager: perspectiveScore(defs, mapOf("MANAGER")),
          },
        ];
      })
    : [];

  return { points, participation, perspectives };
}

// ---------------------------------------------------------------------------
// Manager team view
// ---------------------------------------------------------------------------

export type Direction = "improving" | "flat" | "declining" | "insufficient";

export type TeamMemberAnalytics = {
  userId: string;
  name: string;
  latestManagerScore: number | null;
  latestDelta: number | null;
  direction: Direction;
  participation: Participation;
  /** Latest fully-submitted week's manager score per perspective (heatmap row). */
  heatmap: (number | null)[];
  openBlockers: number;
};

/** 4-week rolling average of manager scores vs the previous 4 weeks. */
export function directionOfTravel(managerScores: number[]): Direction {
  if (managerScores.length < 5) return "insufficient";
  const recent = managerScores.slice(-4);
  const prior = managerScores.slice(-8, -4);
  if (prior.length === 0) return "insufficient";
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const diff = avg(recent) - avg(prior);
  if (diff > 0.15) return "improving";
  if (diff < -0.15) return "declining";
  return "flat";
}

/** Shared row builder behind both the per-manager and org-wide rollups. */
async function analyticsForPeople(
  people: { id: string; name: string }[]
): Promise<TeamMemberAnalytics[]> {
  const out: TeamMemberAnalytics[] = [];
  for (const r of people) {
    const { points, participation } = await individualAnalytics(r.id);
    const scored = points.filter((p) => p.manager != null);
    const latest = scored[scored.length - 1];

    const checkIns = await fetchScoredCheckIns(r.id);
    const latestFull = [...checkIns]
      .reverse()
      .find((c) => c.selfSubmittedAt && c.managerSubmittedAt);
    const heatmap = PERSPECTIVE_ORDER.map((kind) => {
      const p = latestFull?.scorecard.perspectives.find((x) => x.kind === kind);
      if (!latestFull || !p) return null;
      const defs = p.measures.map((m) => ({
        id: m.id,
        weight: m.weight,
        perspectiveId: p.id,
      }));
      return perspectiveScore(
        defs,
        ratingsToMap(
          latestFull.ratings
            .filter((x) => x.rater === "MANAGER")
            .map((x) => ({ measureId: x.measureId, rating: x.rating }))
        )
      );
    });

    const openBlockers = await db.blocker.count({
      where: { userId: r.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    });

    out.push({
      userId: r.id,
      name: r.name,
      latestManagerScore: latest?.manager ?? null,
      latestDelta: latest?.delta ?? null,
      direction: directionOfTravel(
        scored.map((p) => p.manager).filter((x): x is number => x != null)
      ),
      participation,
      heatmap,
      openBlockers,
    });
  }
  return out;
}

/** One row per direct report of `managerId`. */
export async function teamAnalytics(
  managerId: string
): Promise<TeamMemberAnalytics[]> {
  const reports = await db.user.findMany({
    where: { managerId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return analyticsForPeople(reports);
}

/**
 * Every active person, regardless of who they report to — the admin's
 * org-wide picture. Callers MUST check the viewer is an admin first; this
 * function deliberately applies no hierarchy filter of its own.
 */
export async function orgAnalytics(): Promise<TeamMemberAnalytics[]> {
  const people = await db.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return analyticsForPeople(people);
}

// ---------------------------------------------------------------------------
// Admin calibration view
// ---------------------------------------------------------------------------

export type CalibrationData = {
  /** Ratings given by each manager, as counts of 1..5. */
  histograms: { manager: string; counts: [number, number, number, number, number]; total: number }[];
  /** Average manager score per person, ranked descending. */
  ranked: { name: string; manager: string; avg: number; weeks: number }[];
  /** Per-person average delta (self − manager), for the org-wide distribution. */
  deltas: { name: string; delta: number }[];
};

export async function calibrationData(): Promise<CalibrationData> {
  const ratings = await db.measureRating.findMany({
    where: {
      rating: { not: null },
      checkIn: {
        type: "WEEKLY",
        selfSubmittedAt: { not: null },
        managerSubmittedAt: { not: null },
      },
    },
    select: {
      rating: true,
      rater: true,
      checkIn: {
        select: {
          manager: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  const histogramMap = new Map<string, { manager: string; counts: [number, number, number, number, number] }>();
  const perPerson = new Map<
    string,
    { name: string; manager: string; self: number[]; mgr: number[] }
  >();

  for (const r of ratings) {
    const person = perPerson.get(r.checkIn.user.id) ?? {
      name: r.checkIn.user.name,
      manager: r.checkIn.manager.name,
      self: [],
      mgr: [],
    };
    if (r.rater === "SELF") person.self.push(r.rating!);
    else person.mgr.push(r.rating!);
    perPerson.set(r.checkIn.user.id, person);

    if (r.rater === "MANAGER") {
      const h = histogramMap.get(r.checkIn.manager.id) ?? {
        manager: r.checkIn.manager.name,
        counts: [0, 0, 0, 0, 0] as [number, number, number, number, number],
      };
      h.counts[(r.rating! - 1) as 0 | 1 | 2 | 3 | 4]++;
      histogramMap.set(r.checkIn.manager.id, h);
    }
  }

  const avg = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  const weeksPerPerson = await db.checkIn.groupBy({
    by: ["userId"],
    where: {
      type: "WEEKLY",
      selfSubmittedAt: { not: null },
      managerSubmittedAt: { not: null },
    },
    _count: { _all: true },
  });
  const weekCount = new Map(weeksPerPerson.map((w) => [w.userId, w._count._all]));

  const ranked = [...perPerson.entries()]
    .map(([id, p]) => ({
      name: p.name,
      manager: p.manager,
      avg: avg(p.mgr) ?? 0,
      weeks: weekCount.get(id) ?? 0,
    }))
    .filter((p) => p.weeks > 0)
    .sort((a, b) => b.avg - a.avg);

  const deltas = [...perPerson.values()]
    .filter((p) => p.self.length > 0 && p.mgr.length > 0)
    .map((p) => ({ name: p.name, delta: (avg(p.self) ?? 0) - (avg(p.mgr) ?? 0) }))
    .sort((a, b) => b.delta - a.delta);

  return {
    histograms: [...histogramMap.values()]
      .map((h) => ({ ...h, total: h.counts.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => a.manager.localeCompare(b.manager)),
    ranked,
    deltas,
  };
}
