import { db } from "@/lib/db";
import { appUrl, sendMail, type Mail } from "@/lib/mail";
import { getLiveScorecard } from "@/lib/scorecards";
import { currentIsoWeek, previousWeek, weekLabel } from "@/lib/weeks";

/**
 * Scheduled notifications (brief §10). The schedule lives in the
 * `notification_schedule` app setting — config, not code — and the cron
 * endpoint runs HOURLY: a rule fires when its configured day+hour matches
 * the current hour in SAST. Emails never contain scores.
 */

export type ScheduleRule = { day: string; time: string; enabled: boolean };
export type Schedule = Record<string, ScheduleRule>;

export const DEFAULT_SCHEDULE: Schedule = {
  self_evaluation_open: { day: "thursday", time: "14:00", enabled: true },
  self_evaluation_reminder: { day: "friday", time: "16:00", enabled: true },
  manager_awaiting: { day: "monday", time: "08:00", enabled: true },
  manager_incomplete_reminder: { day: "wednesday", time: "08:00", enabled: true },
  admin_overdue: { day: "wednesday", time: "08:00", enabled: true },
};

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

/** Day name + hour in South Africa for a UTC instant. */
export function sastDayHour(now: Date): { day: string; hour: number } {
  const shifted = new Date(now.getTime() + SAST_OFFSET_MS);
  return { day: DAY_NAMES[shifted.getUTCDay()]!, hour: shifted.getUTCHours() };
}

/** Which configured rules fire in the current SAST hour. Pure — tested. */
export function dueRuleKeys(schedule: Schedule, now: Date): string[] {
  const { day, hour } = sastDayHour(now);
  return Object.entries(schedule)
    .filter(([, rule]) => {
      if (!rule.enabled) return false;
      const ruleHour = Number(rule.time.split(":")[0]);
      return rule.day.toLowerCase() === day && ruleHour === hour;
    })
    .map(([key]) => key);
}

export async function loadSchedule(): Promise<Schedule> {
  const row = await db.appSetting.findUnique({
    where: { key: "notification_schedule" },
  });
  if (!row) return DEFAULT_SCHEDULE;
  try {
    return { ...DEFAULT_SCHEDULE, ...(JSON.parse(row.value) as Schedule) };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

// ---------------------------------------------------------------------------
// Rule implementations: each returns the mails to send. No scores, links only.
// ---------------------------------------------------------------------------

/** People expected to check in: active, has a manager and a live scorecard. */
async function participants() {
  const users = await db.user.findMany({
    where: { isActive: true, managerId: { not: null } },
    select: { id: true, name: true, email: true },
  });
  const out: typeof users = [];
  for (const u of users) {
    if (await getLiveScorecard(u.id)) out.push(u);
  }
  return out;
}

async function selfEvaluationMails(reminder: boolean): Promise<Mail[]> {
  const week = currentIsoWeek();
  const people = await participants();
  const mails: Mail[] = [];
  for (const person of people) {
    const checkIn = await db.checkIn.findUnique({
      where: {
        userId_isoYear_isoWeek_type: {
          userId: person.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          type: "WEEKLY",
        },
      },
    });
    if (checkIn?.selfSubmittedAt) continue;
    mails.push({
      to: person.email,
      subject: reminder
        ? `Reminder: submit your ${weekLabel(week)} check-in`
        : `Your ${weekLabel(week)} check-in is open`,
      bodyText: [
        `Hi ${person.name.split(" ")[0]},`,
        "",
        reminder
          ? "Your self-evaluation for this week hasn't been submitted yet. It takes about five minutes."
          : "Your self-evaluation for this week is open. Rate your measures and submit by Friday.",
        "",
        `Open it here: ${appUrl("/check-in")}`,
      ].join("\n"),
    });
  }
  return mails;
}

async function managerAwaitingMails(): Promise<Mail[]> {
  const awaiting = await db.checkIn.groupBy({
    by: ["managerId"],
    where: { status: "AWAITING_MANAGER", type: "WEEKLY" },
    _count: { _all: true },
  });
  const mails: Mail[] = [];
  for (const row of awaiting) {
    const manager = await db.user.findUnique({ where: { id: row.managerId } });
    if (!manager?.isActive) continue;
    const n = row._count._all;
    mails.push({
      to: manager.email,
      subject: `${n} check-in${n === 1 ? "" : "s"} waiting for your evaluation`,
      bodyText: [
        `Hi ${manager.name.split(" ")[0]},`,
        "",
        `${n} of your team's check-ins ${n === 1 ? "is" : "are"} waiting for your evaluation. Their self-ratings stay hidden until you submit yours.`,
        "",
        `Your team: ${appUrl("/team")}`,
      ].join("\n"),
    });
  }
  return mails;
}

/** Wednesday: last week's check-ins that never completed (now missed). */
async function managerIncompleteMails(): Promise<Mail[]> {
  const last = previousWeek(currentIsoWeek());
  const incomplete = await db.checkIn.findMany({
    where: {
      isoYear: last.isoYear,
      isoWeek: last.isoWeek,
      type: "WEEKLY",
      status: { notIn: ["COMPLETE"] },
    },
    include: { user: { select: { name: true } }, manager: true },
  });
  const byManager = new Map<string, { manager: (typeof incomplete)[number]["manager"]; names: string[] }>();
  for (const c of incomplete) {
    const entry = byManager.get(c.managerId) ?? { manager: c.manager, names: [] };
    entry.names.push(c.user.name);
    byManager.set(c.managerId, entry);
  }
  return [...byManager.values()]
    .filter((e) => e.manager.isActive)
    .map((e) => ({
      to: e.manager.email,
      subject: `Last week's check-ins incomplete: ${e.names.length}`,
      bodyText: [
        `Hi ${e.manager.name.split(" ")[0]},`,
        "",
        `These check-ins from ${weekLabel(last)} did not complete: ${e.names.join(", ")}.`,
        "Missed weeks stay on the record. If there is a good reason, an admin can reopen one.",
        "",
        `Your team: ${appUrl("/team")}`,
      ].join("\n"),
    }));
}

/** Wednesday: anything more than one week overdue, to every admin. */
async function adminOverdueMails(): Promise<Mail[]> {
  const current = currentIsoWeek();
  const cutoff = previousWeek(previousWeek(current));
  const overdue = await db.checkIn.findMany({
    where: {
      type: "WEEKLY",
      status: { notIn: ["COMPLETE", "MISSED"] },
      OR: [
        { isoYear: { lt: cutoff.isoYear } },
        { isoYear: cutoff.isoYear, isoWeek: { lte: cutoff.isoWeek } },
      ],
    },
    include: { user: { select: { name: true } } },
  });
  if (overdue.length === 0) return [];
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
  });
  const lines = overdue.map(
    (c) => `- ${c.user.name}, ${weekLabel({ isoYear: c.isoYear, isoWeek: c.isoWeek })}`
  );
  return admins.map((a) => ({
    to: a.email,
    subject: `${overdue.length} check-in${overdue.length === 1 ? "" : "s"} more than a week overdue`,
    bodyText: [
      `Hi ${a.name.split(" ")[0]},`,
      "",
      "Still open beyond one week:",
      ...lines,
      "",
      `Org overview: ${appUrl("/")}`,
    ].join("\n"),
  }));
}

/** Daily: open blockers past their target date, to their owners. */
async function blockerOverdueMails(): Promise<Mail[]> {
  const today = new Date();
  const blockers = await db.blocker.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      targetDate: { lt: today },
      owner: { isActive: true },
    },
    include: {
      owner: true,
      user: { select: { name: true } },
    },
  });
  const byOwner = new Map<string, { owner: NonNullable<(typeof blockers)[number]["owner"]>; items: string[] }>();
  for (const b of blockers) {
    if (!b.owner) continue;
    const entry = byOwner.get(b.owner.id) ?? { owner: b.owner, items: [] };
    entry.items.push(
      `- "${b.description}" (raised by ${b.user.name}, due ${b.targetDate!.toISOString().slice(0, 10)})`
    );
    byOwner.set(b.owner.id, entry);
  }
  return [...byOwner.values()].map((e) => ({
    to: e.owner.email,
    subject: `Blocker${e.items.length === 1 ? "" : "s"} you own ${e.items.length === 1 ? "is" : "are"} overdue`,
    bodyText: [
      `Hi ${e.owner.name.split(" ")[0]},`,
      "",
      "Past target date and still open:",
      ...e.items,
      "",
      "A blocker raised weekly with no movement kills faith in the process — update it or close it out.",
      "",
      appUrl("/blockers"),
    ].join("\n"),
  }));
}

const RULE_RUNNERS: Record<string, () => Promise<Mail[]>> = {
  self_evaluation_open: () => selfEvaluationMails(false),
  self_evaluation_reminder: () => selfEvaluationMails(true),
  manager_awaiting: managerAwaitingMails,
  manager_incomplete_reminder: managerIncompleteMails,
  admin_overdue: adminOverdueMails,
};

/**
 * Run everything due in the current SAST hour, plus the daily blocker
 * check at 08:00. Returns a per-rule summary for the job log.
 */
export async function runDueNotifications(
  now: Date = new Date()
): Promise<Record<string, { sent: number; skipped: number }>> {
  const schedule = await loadSchedule();
  const due = dueRuleKeys(schedule, now);
  if (sastDayHour(now).hour === 8) due.push("blocker_overdue");

  const summary: Record<string, { sent: number; skipped: number }> = {};
  for (const key of due) {
    const runner = key === "blocker_overdue" ? blockerOverdueMails : RULE_RUNNERS[key];
    if (!runner) continue;
    const mails = await runner();
    let sent = 0;
    let skipped = 0;
    for (const mail of mails) {
      (await sendMail(mail)) === "sent" ? sent++ : skipped++;
    }
    summary[key] = { sent, skipped };
  }
  return summary;
}

/**
 * Welcome email: sent when a person's FIRST scorecard is assigned (so they
 * never land in an empty app), and resendable from the user list. Link
 * only — no performance data.
 */
export async function sendWelcomeEmail(userId: string): Promise<"sent" | "skipped"> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return "skipped";
  const first = user.name.split(" ")[0];
  return sendMail({
    to: user.email,
    subject: "You're set up on Heya Performance",
    bodyText: [
      `Hi ${first},`,
      "",
      "Heya Performance is where your weekly check-in happens: you rate your week against your scorecard, your manager rates it independently, and the two of you compare notes in your catch-up.",
      "",
      "There's no password — sign in with your normal Heya Microsoft account:",
      appUrl("/"),
      "",
      'Your scorecard — every measure, and what "meets standard" looks like — is under "My scorecard" once you\'re in. Check-ins open on Thursdays.',
    ].join("\n"),
  });
}

/** Event notification: fired when the second side submits (brief §10). */
export async function notifyBothSubmitted(checkInId: string): Promise<void> {
  const checkIn = await db.checkIn.findUnique({
    where: { id: checkInId },
    include: { user: true, manager: true },
  });
  if (!checkIn || !checkIn.selfSubmittedAt || !checkIn.managerSubmittedAt) return;
  const week = weekLabel({ isoYear: checkIn.isoYear, isoWeek: checkIn.isoWeek });
  const link = appUrl(`/check-in/${checkIn.id}`);
  const mails: Mail[] = [
    {
      to: checkIn.user.email,
      subject: `Scores are in for ${week} — book the conversation`,
      bodyText: `Hi ${checkIn.user.name.split(" ")[0]},\n\nBoth sides of your ${week} check-in are submitted. The ratings are now visible to you and ${checkIn.manager.name}.\n\nSee them and book the conversation: ${link}`,
    },
    {
      to: checkIn.manager.email,
      subject: `Scores are in for ${checkIn.user.name}, ${week}`,
      bodyText: `Hi ${checkIn.manager.name.split(" ")[0]},\n\nBoth sides of ${checkIn.user.name}'s ${week} check-in are submitted and visible.\n\nThe gaps, largest first: ${link}`,
    },
  ];
  for (const mail of mails) {
    try {
      await sendMail(mail);
    } catch (e) {
      console.error("both-submitted notification failed:", e);
    }
  }
}
