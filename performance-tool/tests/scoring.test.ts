import { describe, expect, it } from "vitest";
import {
  delta,
  formatDelta,
  overallScore,
  perspectiveScore,
  round1,
} from "@/lib/scoring";

const measures = [
  { id: "m1", weight: 1, perspectiveId: "p1" },
  { id: "m2", weight: 3, perspectiveId: "p1" },
];

describe("perspectiveScore", () => {
  it("is the weighted mean of ratings", () => {
    const ratings = new Map<string, number | null>([
      ["m1", 2],
      ["m2", 4],
    ]);
    // (1×2 + 3×4) / 4 = 3.5
    expect(perspectiveScore(measures, ratings)).toBe(3.5);
  });

  it("excludes N/A measures from numerator AND denominator", () => {
    const ratings = new Map<string, number | null>([
      ["m1", 2],
      ["m2", null],
    ]);
    expect(perspectiveScore(measures, ratings)).toBe(2);
  });

  it("returns null when nothing is applicable", () => {
    const ratings = new Map<string, number | null>([
      ["m1", null],
      ["m2", null],
    ]);
    expect(perspectiveScore(measures, ratings)).toBeNull();
  });
});

describe("overallScore", () => {
  const perspectives = [
    { id: "p1", weightPct: 40 },
    { id: "p2", weightPct: 60 },
  ];
  const byPerspective = new Map([
    ["p1", [{ id: "a", weight: 1, perspectiveId: "p1" }]],
    ["p2", [{ id: "b", weight: 1, perspectiveId: "p2" }]],
  ]);

  it("weights perspectives by percentage", () => {
    const ratings = new Map<string, number | null>([
      ["a", 5],
      ["b", 3],
    ]);
    // (40×5 + 60×3) / 100 = 3.8
    expect(overallScore(perspectives, byPerspective, ratings)).toBeCloseTo(3.8);
  });

  it("renormalises when a whole perspective is N/A", () => {
    const ratings = new Map<string, number | null>([
      ["a", 4],
      ["b", null],
    ]);
    expect(overallScore(perspectives, byPerspective, ratings)).toBe(4);
  });
});

describe("delta and formatting", () => {
  it("delta is self minus manager", () => {
    expect(delta(4, 3)).toBe(1);
    expect(delta(2.5, 3.5)).toBe(-1);
    expect(delta(null, 3)).toBeNull();
  });

  it("formats with sign and one decimal", () => {
    expect(formatDelta(1)).toBe("+1.0");
    expect(formatDelta(-0.25)).toBe("-0.3");
    expect(round1(3.44)).toBe("3.4");
    expect(round1(null)).toBe("—");
  });
});
