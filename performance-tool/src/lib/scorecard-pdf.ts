import { PDFDocument, StandardFonts } from "pdf-lib";
import { MUTED, Writer } from "@/lib/pdf-writer";

/**
 * A scorecard as a standalone PDF — the measures, definitions, weights and
 * "what a 3 looks like" anchors. Used for both templates and a person's
 * assigned scorecard, e.g. to hand out during onboarding or a review.
 */

export type ScorecardPdfInput = {
  title: string;
  subtitle?: string;
  description?: string | null;
  perspectives: {
    label: string;
    weightPct: number;
    measures: {
      code: string;
      name: string;
      definition: string;
      anchor3: string;
      weight: number;
    }[];
  }[];
};

const SCALE = [
  ["1", "Well below standard — consistently short, immediate intervention needed"],
  ["2", "Below standard — falls short more often than not"],
  ["3", "Meets standard — does the job as it is meant to be done"],
  ["4", "Exceeds standard — consistently better than the standard requires"],
  ["5", "Exceptional — sets the standard for others"],
] as const;

export async function buildScorecardPdf(input: ScorecardPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);

  w.text("Heya Performance — Scorecard", { size: 10, color: MUTED, gapAfter: 4 });
  w.text(input.title, { size: 18, bold: true, gapAfter: 2 });
  if (input.subtitle) w.text(input.subtitle, { color: MUTED, gapAfter: 2 });
  if (input.description?.trim()) w.text(input.description, { gapAfter: 4 });
  w.rule();

  w.text(
    "Every measure is rated 1–5 weekly, by you and by your manager, independently and blind.",
    { color: MUTED, gapAfter: 2 }
  );
  for (const [n, label] of SCALE) {
    w.text(`${n} — ${label}`, { indent: 10, color: MUTED });
  }
  w.rule();

  for (const p of input.perspectives) {
    const equalWeights = p.measures.every((m) => m.weight === p.measures[0]?.weight);
    w.heading(`${p.label} (${p.weightPct}%)`);
    for (const m of p.measures) {
      w.ensure(50);
      w.text(
        `${m.code}  ${m.name}${equalWeights ? "" : `  (weight ${m.weight})`}`,
        { bold: true, gapAfter: 1 }
      );
      w.text(m.definition, { indent: 12, gapAfter: 1 });
      w.text(`3 = ${m.anchor3}`, { indent: 12, color: MUTED, gapAfter: 5 });
    }
  }

  return doc.save();
}
