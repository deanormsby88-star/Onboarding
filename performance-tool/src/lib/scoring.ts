/**
 * Scoring calculations (brief §6). Pure functions — no database access.
 *
 *   perspective_score = Σ (measure_weight × rating) / Σ measure_weight
 *   overall_score     = Σ (perspective_weight% × perspective_score) / 100
 *   delta             = self − manager   (positive = rates self higher)
 *
 * Skipped (not-applicable) measures are excluded from numerator AND
 * denominator, never scored zero.
 */

export type RatingInput = {
  measureId: string;
  rating: number | null; // null = not applicable
};

export type MeasureDef = {
  id: string;
  weight: number;
  perspectiveId: string;
};

export type PerspectiveDef = {
  id: string;
  weightPct: number;
};

export function perspectiveScore(
  measures: MeasureDef[],
  ratings: Map<string, number | null>
): number | null {
  let num = 0;
  let denom = 0;
  for (const m of measures) {
    const r = ratings.get(m.id);
    if (r == null) continue;
    num += m.weight * r;
    denom += m.weight;
  }
  return denom === 0 ? null : num / denom;
}

/**
 * Overall weighted score. Perspectives with no applicable ratings are
 * excluded and the remaining perspective weights are re-normalised, so an
 * all-N/A perspective does not drag the overall score down.
 */
export function overallScore(
  perspectives: PerspectiveDef[],
  measuresByPerspective: Map<string, MeasureDef[]>,
  ratings: Map<string, number | null>
): number | null {
  let num = 0;
  let denom = 0;
  for (const p of perspectives) {
    const score = perspectiveScore(measuresByPerspective.get(p.id) ?? [], ratings);
    if (score == null) continue;
    num += p.weightPct * score;
    denom += p.weightPct;
  }
  return denom === 0 ? null : num / denom;
}

export function delta(
  self: number | null,
  manager: number | null
): number | null {
  if (self == null || manager == null) return null;
  return self - manager;
}

export function ratingsToMap(rows: RatingInput[]): Map<string, number | null> {
  return new Map(rows.map((r) => [r.measureId, r.rating]));
}

export function round1(n: number | null): string {
  return n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1);
}

export function formatDelta(n: number | null): string {
  if (n == null) return "—";
  // Round half away from zero so +0.25 and −0.25 display symmetrically.
  const rounded = (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}`;
}
