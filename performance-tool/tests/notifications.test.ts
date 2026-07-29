import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCHEDULE,
  dueRuleKeys,
  sastDayHour,
  type Schedule,
} from "@/lib/notifications";

describe("sastDayHour", () => {
  it("shifts UTC to SAST (+02:00, no DST)", () => {
    // Thursday 12:00 UTC = Thursday 14:00 SAST
    expect(sastDayHour(new Date("2026-07-30T12:00:00Z"))).toEqual({
      day: "thursday",
      hour: 14,
    });
    // Sunday 23:00 UTC = Monday 01:00 SAST
    expect(sastDayHour(new Date("2026-08-02T23:00:00Z"))).toEqual({
      day: "monday",
      hour: 1,
    });
  });
});

describe("dueRuleKeys", () => {
  it("fires the Thursday 14:00 SAST rule at 12:00 UTC on a Thursday", () => {
    expect(
      dueRuleKeys(DEFAULT_SCHEDULE, new Date("2026-07-30T12:00:00Z"))
    ).toEqual(["self_evaluation_open"]);
  });

  it("fires both Wednesday 08:00 rules together", () => {
    expect(
      dueRuleKeys(DEFAULT_SCHEDULE, new Date("2026-07-29T06:00:00Z")).sort()
    ).toEqual(["admin_overdue", "manager_incomplete_reminder"]);
  });

  it("fires nothing off the hour/day", () => {
    expect(dueRuleKeys(DEFAULT_SCHEDULE, new Date("2026-07-30T13:00:00Z"))).toEqual([]);
    expect(dueRuleKeys(DEFAULT_SCHEDULE, new Date("2026-07-28T12:00:00Z"))).toEqual([]);
  });

  it("disabled rules never fire; config overrides the day", () => {
    const schedule: Schedule = {
      ...DEFAULT_SCHEDULE,
      self_evaluation_open: { day: "tuesday", time: "14:00", enabled: true },
      manager_awaiting: { ...DEFAULT_SCHEDULE.manager_awaiting!, enabled: false },
    };
    // Tuesday 14:00 SAST
    expect(dueRuleKeys(schedule, new Date("2026-07-28T12:00:00Z"))).toEqual([
      "self_evaluation_open",
    ]);
    // Monday 08:00 SAST — manager_awaiting is disabled
    expect(dueRuleKeys(schedule, new Date("2026-07-27T06:00:00Z"))).toEqual([]);
  });
});
