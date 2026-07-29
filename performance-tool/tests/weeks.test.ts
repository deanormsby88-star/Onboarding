import { describe, expect, it } from "vitest";
import {
  currentIsoWeek,
  formatWeekRange,
  isoWeekOf,
  previousWeek,
  weekEnd,
  weekLabel,
  weekStart,
} from "@/lib/weeks";

describe("ISO weeks", () => {
  it("computes the week for a mid-year date", () => {
    // 29 July 2026 is a Wednesday in ISO week 31.
    expect(isoWeekOf(new Date("2026-07-29T12:00:00Z"))).toEqual({
      isoYear: 2026,
      isoWeek: 31,
    });
  });

  it("labels weeks as YYYY-Www", () => {
    expect(weekLabel({ isoYear: 2026, isoWeek: 31 })).toBe("2026-W31");
    expect(weekLabel({ isoYear: 2026, isoWeek: 5 })).toBe("2026-W05");
  });

  it("handles year boundaries (1 Jan 2027 belongs to 2026-W53)", () => {
    expect(isoWeekOf(new Date("2027-01-01T12:00:00Z"))).toEqual({
      isoYear: 2026,
      isoWeek: 53,
    });
    expect(isoWeekOf(new Date("2026-01-01T12:00:00Z"))).toEqual({
      isoYear: 2026,
      isoWeek: 1,
    });
  });

  it("weeks run Monday to Sunday", () => {
    const week = { isoYear: 2026, isoWeek: 31 };
    expect(weekStart(week).toISOString().slice(0, 10)).toBe("2026-07-27");
    expect(weekEnd(week).toISOString().slice(0, 10)).toBe("2026-08-02");
    expect(weekStart(week).getUTCDay()).toBe(1);
    expect(weekEnd(week).getUTCDay()).toBe(0);
  });

  it("previousWeek steps across year boundaries", () => {
    expect(previousWeek({ isoYear: 2026, isoWeek: 1 })).toEqual({
      isoYear: 2025,
      isoWeek: 52,
    });
  });

  it("applies the SAST offset: Sunday 22:30 UTC is already Monday in SA", () => {
    // 2026-08-02 22:30 UTC = 2026-08-03 00:30 SAST (Monday, week 32).
    expect(currentIsoWeek(new Date("2026-08-02T22:30:00Z"))).toEqual({
      isoYear: 2026,
      isoWeek: 32,
    });
    expect(currentIsoWeek(new Date("2026-08-02T21:30:00Z"))).toEqual({
      isoYear: 2026,
      isoWeek: 31,
    });
  });

  it("formats a readable range", () => {
    expect(formatWeekRange({ isoYear: 2026, isoWeek: 31 })).toMatch(/27.*Jul/i);
  });
});
