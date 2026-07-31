import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  assignTemplateToUser,
  getLiveScorecard,
  saveTemplate,
  ScorecardValidationError,
  templateInputSchema,
  type TemplateInput,
} from "@/lib/scorecards";
import { SEED_TEMPLATES } from "../prisma/template-data";

const T = "scorecard-test";
let userId: string;
let actorId: string;

function validTemplate(name: string): TemplateInput {
  return {
    name,
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
        {
          code: "x.1",
          name: "Measure one",
          definition: "Definition",
          anchor3: "Anchor",
          weight: 1,
        },
        {
          code: "x.2",
          name: "Measure two",
          definition: "Definition",
          anchor3: "Anchor",
          weight: 2,
        },
      ],
    })),
  };
}

async function cleanup() {
  const templates = await db.scorecardTemplate.findMany({
    where: { name: { contains: T } },
    select: { id: true },
  });
  await db.scorecard.deleteMany({
    where: { user: { email: { contains: T } } },
  });
  await db.scorecardTemplate.deleteMany({
    where: { id: { in: templates.map((t) => t.id) } },
  });
  await db.user.deleteMany({ where: { email: { contains: T } } });
}

beforeAll(async () => {
  await cleanup();
  const user = await db.user.create({
    data: { email: `subject.${T}@example.test`, name: "Subject", role: "EMPLOYEE" },
  });
  const actor = await db.user.create({
    data: { email: `actor.${T}@example.test`, name: "Actor", role: "ADMIN" },
  });
  userId = user.id;
  actorId = actor.id;
});

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("templateInputSchema", () => {
  it("accepts a valid template", () => {
    expect(templateInputSchema.safeParse(validTemplate("ok")).success).toBe(true);
  });

  it("rejects weights that do not sum to 100", () => {
    const tpl = validTemplate("bad-weights");
    tpl.perspectives[0]!.weightPct = 50;
    const result = templateInputSchema.safeParse(tpl);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("sum to 100%");
  });

  it("rejects fewer than 2 or more than 5 measures in a perspective", () => {
    const tooFew = validTemplate("too-few");
    tooFew.perspectives[0]!.measures = tooFew.perspectives[0]!.measures.slice(0, 1);
    expect(templateInputSchema.safeParse(tooFew).success).toBe(false);

    const tooMany = validTemplate("too-many");
    const base = tooMany.perspectives[0]!.measures[0]!;
    tooMany.perspectives[0]!.measures = Array.from({ length: 6 }, (_, i) => ({
      ...base,
      code: `x.${i}`,
    }));
    expect(templateInputSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects a missing anchor", () => {
    const tpl = validTemplate("no-anchor");
    tpl.perspectives[0]!.measures[0]!.anchor3 = "";
    expect(templateInputSchema.safeParse(tpl).success).toBe(false);
  });

  it("accepts a template with a section removed, as long as weights re-sum to 100", () => {
    const tpl = validTemplate("three-sections");
    tpl.perspectives = tpl.perspectives.slice(0, 3);
    tpl.perspectives[0]!.weightPct = 50;
    tpl.perspectives[1]!.weightPct = 30;
    tpl.perspectives[2]!.weightPct = 20;
    expect(templateInputSchema.safeParse(tpl).success).toBe(true);
  });

  it("rejects an empty template and duplicate sections", () => {
    const empty = validTemplate("empty");
    empty.perspectives = [];
    expect(templateInputSchema.safeParse(empty).success).toBe(false);

    const dupes = validTemplate("dupes");
    dupes.perspectives[1]! = { ...dupes.perspectives[0]!, weightPct: 20 };
    expect(templateInputSchema.safeParse(dupes).success).toBe(false);
  });

  it("all nine v4 seed templates are valid", () => {
    expect(SEED_TEMPLATES).toHaveLength(9);
    for (const tpl of SEED_TEMPLATES) {
      const result = templateInputSchema.safeParse(tpl);
      expect(result.success, `${tpl.name}: ${result.error?.message}`).toBe(true);
    }
  });

  it("v4 templates hold 12-13 measures each and weights sum to 100", () => {
    for (const tpl of SEED_TEMPLATES) {
      const count = tpl.perspectives.reduce((s, p) => s + p.measures.length, 0);
      expect(count, tpl.name).toBeGreaterThanOrEqual(12);
      expect(count, tpl.name).toBeLessThanOrEqual(13);
      const weights = tpl.perspectives.reduce((s, p) => s + p.weightPct, 0);
      expect(weights, tpl.name).toBe(100);
    }
  });

  it("rejects a template over the 13-measure ceiling", () => {
    const tpl = validTemplate("too-long");
    // 4 perspectives × 2 measures = 8; pad one perspective past the ceiling.
    const base = tpl.perspectives[0]!.measures[0]!;
    tpl.perspectives.forEach((p, pi) => {
      p.measures = Array.from({ length: pi === 0 ? 5 : 3 }, (_, i) => ({
        ...base,
        code: `${pi}.${i}`,
      }));
    });
    // 5 + 3 + 3 + 3 = 14 measures
    const result = templateInputSchema.safeParse(tpl);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("capped at 13");
  });
});

describe("assignment and versioning", () => {
  it("assigning copies the template into an independent v1 instance", async () => {
    const tplId = await saveTemplate(null, validTemplate(`${T}-v1`));
    const sc = await assignTemplateToUser({
      userId,
      templateId: tplId,
      effectiveFrom: new Date("2026-07-01"),
      actorId,
    });
    expect(sc.version).toBe(1);

    const live = await getLiveScorecard(userId, new Date("2026-07-10"));
    expect(live?.id).toBe(sc.id);
    expect(live?.perspectives).toHaveLength(4);
    expect(live?.perspectives[0]?.measures).toHaveLength(2);
  });

  it("editing the template afterwards does not touch the assigned instance", async () => {
    const tpl = await db.scorecardTemplate.findFirst({
      where: { name: `${T}-v1` },
    });
    const changed = validTemplate(`${T}-v1`);
    changed.perspectives[0]!.measures[0]!.name = "RENAMED IN TEMPLATE";
    await saveTemplate(tpl!.id, changed);

    const live = await getLiveScorecard(userId, new Date("2026-07-10"));
    expect(live?.perspectives[0]?.measures[0]?.name).toBe("Measure one");
  });

  it("re-assigning creates v2 and closes v1 at the effective date", async () => {
    const tpl2Id = await saveTemplate(null, validTemplate(`${T}-v2`));
    const sc2 = await assignTemplateToUser({
      userId,
      templateId: tpl2Id,
      effectiveFrom: new Date("2026-07-20"),
      actorId,
    });
    expect(sc2.version).toBe(2);

    // Before the cutover the old version is still the one in force.
    const before = await getLiveScorecard(userId, new Date("2026-07-15"));
    expect(before?.version).toBe(1);
    const after = await getLiveScorecard(userId, new Date("2026-07-25"));
    expect(after?.version).toBe(2);
  });

  it("refuses to assign starting before the current version began", async () => {
    const tplId = await saveTemplate(null, validTemplate(`${T}-backdated`));
    await expect(
      assignTemplateToUser({
        userId,
        templateId: tplId,
        effectiveFrom: new Date("2026-06-01"),
        actorId,
      })
    ).rejects.toBeInstanceOf(ScorecardValidationError);
  });

  it("refuses to assign an archived template", async () => {
    const tplId = await saveTemplate(null, validTemplate(`${T}-archived`));
    await db.scorecardTemplate.update({
      where: { id: tplId },
      data: { archived: true },
    });
    await expect(
      assignTemplateToUser({
        userId,
        templateId: tplId,
        effectiveFrom: new Date("2026-08-01"),
        actorId,
      })
    ).rejects.toBeInstanceOf(ScorecardValidationError);
  });
});
