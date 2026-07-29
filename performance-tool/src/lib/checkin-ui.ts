import type { MeasureRating } from "@prisma/client";
import { PERSPECTIVE_LABEL, type ScorecardWithContent } from "@/lib/scorecards";
import type {
  FormEntry,
  FormPerspective,
} from "@/components/check-in-form";

/** Serialize a scorecard + existing ratings into client-form props. */

export function toFormPerspectives(
  scorecard: ScorecardWithContent
): FormPerspective[] {
  return scorecard.perspectives.map((p) => ({
    id: p.id,
    label: PERSPECTIVE_LABEL[p.kind],
    weightPct: p.weightPct,
    measures: p.measures.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      definition: m.definition,
      anchor3: m.anchor3,
    })),
  }));
}

export function toFormEntries(
  ratings: MeasureRating[]
): Record<string, FormEntry> {
  return Object.fromEntries(
    ratings.map((r) => [
      r.measureId,
      {
        rating: r.rating,
        notApplicable: r.notApplicable,
        naReason: r.naReason ?? "",
        comment: r.comment ?? "",
      },
    ])
  );
}

export const SELF_NARRATIVE_FIELDS = [
  { key: "winOfWeek", label: "Win of the week" },
  { key: "focusNextWeek", label: "Focus for next week" },
  {
    key: "inTheWay",
    label: "What is in the way",
    hint: "Anything here can be promoted to a tracked blocker with an owner.",
  },
  { key: "supportNeeded", label: "Support needed" },
];

export const MANAGER_NARRATIVE_FIELDS = [
  { key: "coachingNote", label: "Coaching note" },
  { key: "agreedPriorities", label: "Agreed priorities for next week" },
];
