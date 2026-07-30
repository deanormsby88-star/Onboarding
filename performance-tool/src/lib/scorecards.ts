import { PerspectiveKind, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Scorecard templates and instances (build brief §4).
 *
 * Templates are reusable per role family. Assigning one creates an
 * independent, versioned scorecard INSTANCE with copied perspectives and
 * measures, so editing a template never rewrites anyone's history. A new
 * assignment supersedes the previous version via effective dates; historic
 * check-ins stay attached to the version that was live when they happened.
 */

export const PERSPECTIVE_ORDER: PerspectiveKind[] = [
  "DELIVERY_QUALITY",
  "CLIENT_STAKEHOLDER",
  "COMMERCIAL_EFFICIENCY",
  "PEOPLE_GROWTH",
];

export const PERSPECTIVE_LABEL: Record<PerspectiveKind, string> = {
  DELIVERY_QUALITY: "Delivery and Quality",
  CLIENT_STAKEHOLDER: "Client and Stakeholder",
  COMMERCIAL_EFFICIENCY: "Commercial and Efficiency",
  PEOPLE_GROWTH: "People and Growth",
};

const measureSchema = z.object({
  code: z.string().trim().min(1, "Every measure needs a code, e.g. 1.1").max(10),
  name: z.string().trim().min(1, "Every measure needs a name").max(200),
  definition: z.string().trim().min(1, "Every measure needs a definition"),
  anchor3: z
    .string()
    .trim()
    .min(1, 'Every measure needs its "what a 3 looks like" anchor'),
  weight: z.number().int().min(1).max(100),
});

const perspectiveSchema = z.object({
  kind: z.enum(PerspectiveKind),
  weightPct: z.number().int().min(0).max(100),
  measures: z
    .array(measureSchema)
    .min(2, "Each perspective needs 2–5 measures")
    .max(5, "Each perspective needs 2–5 measures"),
});

export const templateInputSchema = z
  .object({
    name: z.string().trim().min(1, "The template needs a name").max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    // The four perspectives are the default and keep scores comparable
    // across roles, but a template may drop sections that don't apply.
    perspectives: z
      .array(perspectiveSchema)
      .min(1, "A scorecard needs at least one perspective")
      .max(4),
  })
  .superRefine((tpl, ctx) => {
    const kinds = new Set(tpl.perspectives.map((p) => p.kind));
    if (kinds.size !== tpl.perspectives.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each perspective may appear only once",
      });
    }
    const total = tpl.perspectives.reduce((sum, p) => sum + p.weightPct, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: "custom",
        message: `Perspective weights must sum to 100% (currently ${total}%)`,
      });
    }
  });

export type TemplateInput = z.infer<typeof templateInputSchema>;

export class ScorecardValidationError extends Error {}

/** Create or fully replace a template's content. */
export async function saveTemplate(templateId: string | null, input: TemplateInput) {
  return db.$transaction(async (tx) => {
    let id = templateId;
    if (id) {
      const existing = await tx.scorecardTemplate.findUnique({ where: { id } });
      if (!existing) throw new ScorecardValidationError("Template not found.");
      await tx.scorecardTemplate.update({
        where: { id },
        data: { name: input.name, description: input.description || null },
      });
      // Instances copy template content on assignment, so replacing template
      // rows never touches history.
      await tx.templatePerspective.deleteMany({ where: { templateId: id } });
    } else {
      const created = await tx.scorecardTemplate.create({
        data: { name: input.name, description: input.description || null },
      });
      id = created.id;
    }
    for (const [pi, p] of input.perspectives.entries()) {
      await tx.templatePerspective.create({
        data: {
          templateId: id,
          kind: p.kind,
          weightPct: p.weightPct,
          sortOrder: pi,
          measures: {
            create: p.measures.map((m, mi) => ({
              code: m.code,
              name: m.name,
              definition: m.definition,
              anchor3: m.anchor3,
              weight: m.weight,
              sortOrder: mi,
            })),
          },
        },
      });
    }
    return id;
  });
}

export const templateWithContent = {
  perspectives: {
    orderBy: { sortOrder: "asc" as const },
    include: { measures: { orderBy: { sortOrder: "asc" as const } } },
  },
};

export async function getTemplate(id: string) {
  return db.scorecardTemplate.findUnique({
    where: { id },
    include: templateWithContent,
  });
}

/**
 * Assign a template to a person as of `effectiveFrom`. Creates version n+1
 * with copied content and closes the previous live version.
 */
export async function assignTemplateToUser(opts: {
  userId: string;
  templateId: string;
  effectiveFrom: Date;
  actorId: string;
}) {
  const { userId, templateId, effectiveFrom, actorId } = opts;
  return db.$transaction(async (tx) => {
    const template = await tx.scorecardTemplate.findUnique({
      where: { id: templateId },
      include: templateWithContent,
    });
    if (!template || template.archived) {
      throw new ScorecardValidationError("Template not found or archived.");
    }
    if (template.perspectives.length < 1) {
      throw new ScorecardValidationError(
        "This template has no perspectives and cannot be assigned."
      );
    }

    const latest = await tx.scorecard.findFirst({
      where: { userId },
      orderBy: { version: "desc" },
    });
    if (latest && !latest.effectiveTo) {
      if (latest.effectiveFrom > effectiveFrom) {
        throw new ScorecardValidationError(
          "The new scorecard cannot start before the current one did."
        );
      }
      await tx.scorecard.update({
        where: { id: latest.id },
        data: { effectiveTo: effectiveFrom },
      });
    }

    return tx.scorecard.create({
      data: {
        userId,
        templateId,
        version: (latest?.version ?? 0) + 1,
        effectiveFrom,
        createdById: actorId,
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
    });
  });
}

export const scorecardWithContent = {
  perspectives: {
    orderBy: { sortOrder: "asc" as const },
    include: { measures: { orderBy: { sortOrder: "asc" as const } } },
  },
  template: { select: { name: true } },
};

export type ScorecardWithContent = Prisma.ScorecardGetPayload<{
  include: typeof scorecardWithContent;
}>;

/** The scorecard version in force for a user on a given date, if any. */
export async function getLiveScorecard(
  userId: string,
  onDate: Date = new Date()
): Promise<ScorecardWithContent | null> {
  return db.scorecard.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: onDate } }],
    },
    orderBy: { version: "desc" },
    include: scorecardWithContent,
  });
}
