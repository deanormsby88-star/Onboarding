import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/checkins";
import { orgAnalytics } from "@/lib/analytics";
import { round1, formatDelta } from "@/lib/scoring";
import { currentIsoWeek, formatWeekRange, weekLabel } from "@/lib/weeks";
import { AppShell } from "@/components/app-shell";

/**
 * Org-wide overview (admin only).
 *
 * "My team" is deliberately scoped to a manager's own reports. An admin
 * still needs the whole picture, including people several levels down and
 * people who report to nobody, so this page applies no hierarchy filter.
 * The role check below is the only thing standing between this and
 * everyone's data, so it stays at the very top.
 */
export default async function EveryonePage() {
  const viewer = await requireUser();
  if (viewer.role !== "ADMIN") notFound();

  const week = currentIsoWeek();
  const [people, analytics] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        manager: { select: { name: true } },
        checkIns: {
          where: { isoYear: week.isoYear, isoWeek: week.isoWeek, type: "WEEKLY" },
          take: 1,
        },
        scorecards: {
          where: { effectiveTo: null },
          include: { template: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    orgAnalytics(),
  ]);

  // POPIA: reading another person's performance data is logged, and a
  // whole-org view is many such reads. One row per subject, viewer excluded.
  const subjects = people.filter((p) => p.id !== viewer.id).map((p) => p.id);
  if (subjects.length > 0) {
    await db.accessLog.createMany({
      data: subjects.map((subjectUserId) => ({
        viewerId: viewer.id,
        subjectUserId,
        entity: "org_overview",
      })),
    });
  }

  const byUser = new Map(analytics.map((a) => [a.userId, a]));
  const withScorecard = people.filter((p) => p.scorecards.length > 0).length;
  const statusCount = (...of: string[]) =>
    people.filter((p) => {
      const s = p.checkIns[0]?.status;
      return of.includes(s ?? "NOT_STARTED");
    }).length;
  const complete = statusCount("COMPLETE");
  const inFlight = statusCount(
    "SELF_IN_PROGRESS",
    "AWAITING_MANAGER",
    "AWAITING_DISCUSSION",
    "AWAITING_ACKNOWLEDGEMENT"
  );
  const notStarted = statusCount("NOT_STARTED");
  const missed = statusCount("MISSED");
  const openBlockers = analytics.reduce((sum, a) => sum + a.openBlockers, 0);

  return (
    <AppShell user={viewer}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Everyone</h1>
        <p className="text-sm text-gray-500">
          {weekLabel(week)} · {formatWeekRange(week)}
        </p>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Every active person, whoever they report to. Scores show only for
        weeks where both sides submitted — the blind rule applies to you too.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="People" value={people.length} />
        <Tile
          label="With a scorecard"
          value={`${withScorecard}/${people.length}`}
          tone={withScorecard < people.length ? "warn" : "ok"}
        />
        <Tile label="Complete" value={complete} tone={complete > 0 ? "ok" : undefined} />
        <Tile label="In progress" value={inFlight} />
        <Tile label="Not started" value={notStarted} tone={notStarted > 0 ? "warn" : undefined} />
        <Tile label="Missed" value={missed} tone={missed > 0 ? "bad" : undefined} />
      </dl>
      {openBlockers > 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          {openBlockers} open blocker{openBlockers === 1 ? "" : "s"} across the
          organisation.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium">Reports to</th>
              <th className="px-4 py-2.5 font-medium">Scorecard</th>
              <th className="px-4 py-2.5 font-medium">This week</th>
              <th className="px-4 py-2.5 text-right font-medium">Manager score</th>
              <th className="px-4 py-2.5 text-right font-medium">Delta</th>
              <th className="px-4 py-2.5 font-medium">Trend</th>
              <th className="px-4 py-2.5 text-right font-medium">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const a = byUser.get(p.id);
              const status = p.checkIns[0]?.status ?? "NOT_STARTED";
              const card = p.scorecards[0];
              return (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/team/${p.id}`}
                      className="font-medium text-heya-blue hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.jobTitle ? (
                      <span className="block text-xs text-gray-500">
                        {p.jobTitle}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {p.manager?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {card ? (
                      <span className="text-gray-600">
                        {card.template?.name ?? "Custom"}
                      </span>
                    ) : (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        None assigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {round1(a?.latestManagerScore ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatDelta(a?.latestDelta ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {DIRECTION_LABEL[a?.direction ?? "insufficient"]}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {a?.openBlockers ? a.openBlockers : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Opening this page is recorded in the access log against each person,
        as required by POPIA. Click a name for their full record.
      </p>
    </AppShell>
  );
}

const DIRECTION_LABEL = {
  improving: "Improving",
  flat: "Flat",
  declining: "Declining",
  insufficient: "Not enough data",
} as const;

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
}) {
  const toneClass =
    tone === "ok"
      ? "text-heya-green"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: keyof typeof STATUS_LABEL }) {
  const tone =
    status === "COMPLETE"
      ? "bg-green-50 text-green-700"
      : status === "MISSED"
        ? "bg-red-50 text-red-700"
        : status === "NOT_STARTED"
          ? "bg-gray-100 text-gray-600"
          : "bg-blue-50 text-blue-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
