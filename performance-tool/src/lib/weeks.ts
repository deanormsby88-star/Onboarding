/**
 * ISO week helpers. Weeks run Monday-Sunday and are identified as
 * "2026-W31" (brief §5). All date maths is done in UTC; the app treats the
 * calendar week in SAST as the working unit, and SAST has no DST, so a
 * fixed +02:00 shift is applied when deriving "today's" week.
 */

export type IsoWeek = { isoYear: number; isoWeek: number };

const DAY_MS = 86_400_000;
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/** ISO week for a UTC instant. */
export function isoWeekOf(date: Date): IsoWeek {
  // Thursday of the current week decides the ISO year.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const isoWeek = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { isoYear, isoWeek };
}

/** The ISO week it currently is in South Africa. */
export function currentIsoWeek(now: Date = new Date()): IsoWeek {
  return isoWeekOf(new Date(now.getTime() + SAST_OFFSET_MS));
}

export function weekLabel({ isoYear, isoWeek }: IsoWeek): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

/** Monday 00:00 UTC of the given ISO week. */
export function weekStart({ isoYear, isoWeek }: IsoWeek): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * DAY_MS);
  return new Date(week1Monday.getTime() + (isoWeek - 1) * 7 * DAY_MS);
}

/** Sunday of the given ISO week (date only, UTC). */
export function weekEnd(week: IsoWeek): Date {
  return new Date(weekStart(week).getTime() + 6 * DAY_MS);
}

export function previousWeek(week: IsoWeek): IsoWeek {
  return isoWeekOf(new Date(weekStart(week).getTime() - DAY_MS));
}

export function formatWeekRange(week: IsoWeek): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(weekStart(week))} – ${fmt(weekEnd(week))}`;
}
