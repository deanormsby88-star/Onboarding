import Link from "next/link";
import { notFound } from "next/navigation";
import type { MeasureRating } from "@prisma/client";
import { requireUser } from "@/lib/current-user";
import { CheckInError, getCheckInView, STATUS_LABEL } from "@/lib/checkins";
import { PERSPECTIVE_LABEL } from "@/lib/scorecards";
import {
  delta,
  formatDelta,
  overallScore,
  perspectiveScore,
  ratingsToMap,
  round1,
} from "@/lib/scoring";
import { formatWeekRange, weekLabel } from "@/lib/weeks";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import {
  acknowledgeAction,
  markDiscussionAction,
  promoteBlockerAction,
  reopenMissedAction,
} from "../actions";

function ratingCell(r: MeasureRating | undefined, color: "blue" | "purple") {
  if (!r || (r.rating == null && !r.notApplicable)) {
    return <span className="text-gray-300">–</span>;
  }
  if (r.notApplicable) return <span className="text-xs text-gray-500">N/A</span>;
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-white ${
        color === "blue" ? "bg-heya-blue" : "bg-heya-purple"
      }`}
    >
      {r.rating}
    </span>
  );
}

export default async function CheckInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  let view;
  try {
    view = await getCheckInView(id, user);
  } catch (e) {
    if (e instanceof CheckInError) notFound();
    throw e;
  }

  const { checkIn, scorecard } = view;
  const week = { isoYear: checkIn.isoYear, isoWeek: checkIn.isoWeek };
  const selfMap = view.selfRatings
    ? ratingsToMap(
        view.selfRatings.map((r) => ({ measureId: r.measureId, rating: r.rating }))
      )
    : null;
  const managerMap = view.managerRatings
    ? ratingsToMap(
        view.managerRatings.map((r) => ({ measureId: r.measureId, rating: r.rating }))
      )
    : null;

  const perspectiveDefs = scorecard.perspectives.map((p) => ({
    id: p.id,
    weightPct: p.weightPct,
  }));
  const measuresByPerspective = new Map(
    scorecard.perspectives.map((p) => [
      p.id,
      p.measures.map((m) => ({ id: m.id, weight: m.weight, perspectiveId: p.id })),
    ])
  );
  const selfOverall = selfMap
    ? overallScore(perspectiveDefs, measuresByPerspective, selfMap)
    : null;
  const managerOverall = managerMap
    ? overallScore(perspectiveDefs, measuresByPerspective, managerMap)
    : null;

  const selfByMeasure = new Map(view.selfRatings?.map((r) => [r.measureId, r]) ?? []);
  const managerByMeasure = new Map(
    view.managerRatings?.map((r) => [r.measureId, r]) ?? []
  );

  // The reveal: measures sorted by gap, largest first — the agenda for the
  // conversation (brief §12).
  const revealRows = view.bothSubmitted
    ? scorecard.perspectives
        .flatMap((p) =>
          p.measures.map((m) => {
            const s = selfByMeasure.get(m.id);
            const g = managerByMeasure.get(m.id);
            const d =
              s?.rating != null && g?.rating != null ? s.rating - g.rating : null;
            return { measure: m, perspective: p, self: s, manager: g, delta: d };
          })
        )
        .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    : [];

  const promotableUsers =
    view.isManager || view.isSubject || user.role === "ADMIN"
      ? await db.user.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [];

  const narrativeBlocks: [string, string | null][] = [
    ["Win of the week", checkIn.winOfWeek],
    ["Focus for next week", checkIn.focusNextWeek],
    ["What is in the way", checkIn.inTheWay],
    ["Support needed", checkIn.supportNeeded],
    ["Coaching note", view.bothSubmitted || view.isManager ? checkIn.coachingNote : null],
    [
      "Agreed priorities for next week",
      view.bothSubmitted || view.isManager ? checkIn.agreedPriorities : null,
    ],
  ];

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {checkIn.user.name} · {weekLabel(week)}
        </h1>
        <p className="text-sm text-gray-500">{formatWeekRange(week)}</p>
      </div>
      <p className="mt-1 text-sm">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            checkIn.status === "COMPLETE"
              ? "bg-green-50 text-heya-green"
              : checkIn.status === "MISSED"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-heya-blue"
          }`}
        >
          {STATUS_LABEL[checkIn.status]}
        </span>
        {view.canEditSelf ? (
          <Link href="/check-in" className="ml-3 text-heya-blue hover:underline">
            Continue your self-rating →
          </Link>
        ) : null}
        {view.canEditManager ? (
          <Link
            href={`/team/${checkIn.userId}/rate`}
            className="ml-3 text-heya-purple hover:underline"
          >
            Complete your evaluation →
          </Link>
        ) : null}
      </p>

      {!view.bothSubmitted ? (
        <p className="mt-6 max-w-xl rounded-md bg-white p-4 text-sm text-gray-600 shadow-sm">
          Scores stay hidden from the other side until both of you have
          submitted. Submitted so far:{" "}
          {checkIn.selfSubmittedAt ? `${checkIn.user.name} ✓` : null}
          {checkIn.selfSubmittedAt && checkIn.managerSubmittedAt ? " · " : null}
          {checkIn.managerSubmittedAt ? `${checkIn.manager.name} (manager) ✓` : null}
          {!checkIn.selfSubmittedAt && !checkIn.managerSubmittedAt ? "neither side yet" : null}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Self overall</p>
              <p className="mt-1 text-3xl font-semibold text-heya-blue">
                {round1(selfOverall)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Manager overall</p>
              <p className="mt-1 text-3xl font-semibold text-heya-purple">
                {round1(managerOverall)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Delta (self − manager)</p>
              <p className="mt-1 text-3xl font-semibold">
                {formatDelta(delta(selfOverall, managerOverall))}
              </p>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-medium">
              The conversation, largest gaps first
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-heya-blue">Self</span> ·{" "}
              <span className="font-medium text-heya-purple">Manager</span>
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Measure</th>
                    <th className="px-3 py-2.5 text-center font-medium">Self</th>
                    <th className="px-3 py-2.5 text-center font-medium">Manager</th>
                    <th className="px-3 py-2.5 text-center font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {revealRows.map(({ measure, self, manager, delta: d }) => (
                    <tr
                      key={measure.id}
                      className="border-b border-gray-100 align-top last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          <span className="mr-2 text-gray-400">{measure.code}</span>
                          {measure.name}
                        </p>
                        {self?.comment ? (
                          <p className="mt-1 text-xs text-gray-600">
                            <span className="font-medium text-heya-blue">Self:</span>{" "}
                            {self.comment}
                          </p>
                        ) : null}
                        {self?.notApplicable ? (
                          <p className="mt-1 text-xs text-gray-500">
                            Self N/A: {self.naReason}
                          </p>
                        ) : null}
                        {manager?.comment ? (
                          <p className="mt-1 text-xs text-gray-600">
                            <span className="font-medium text-heya-purple">
                              Manager:
                            </span>{" "}
                            {manager.comment}
                          </p>
                        ) : null}
                        {manager?.notApplicable ? (
                          <p className="mt-1 text-xs text-gray-500">
                            Manager N/A: {manager.naReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ratingCell(self, "blue")}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {ratingCell(manager, "purple")}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold">
                        {d == null ? (
                          <span className="text-gray-300">–</span>
                        ) : (
                          <span
                            className={
                              Math.abs(d) >= 2
                                ? "text-red-600"
                                : Math.abs(d) === 1
                                  ? "text-amber-600"
                                  : "text-heya-green"
                            }
                          >
                            {formatDelta(d)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {scorecard.perspectives.map((p) => {
              const s = selfMap
                ? perspectiveScore(measuresByPerspective.get(p.id) ?? [], selfMap)
                : null;
              const g = managerMap
                ? perspectiveScore(measuresByPerspective.get(p.id) ?? [], managerMap)
                : null;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
                >
                  <span>
                    {PERSPECTIVE_LABEL[p.kind]}{" "}
                    <span className="text-gray-400">({p.weightPct}%)</span>
                  </span>
                  <span className="flex items-center gap-3 font-medium">
                    <span className="text-heya-blue">{round1(s)}</span>
                    <span className="text-heya-purple">{round1(g)}</span>
                    <span className="text-gray-500">{formatDelta(delta(s, g))}</span>
                  </span>
                </div>
              );
            })}
          </section>
        </>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {narrativeBlocks
          .filter(([, v]) => v?.trim())
          .map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="mt-1 whitespace-pre-line text-sm">{value}</p>
            </div>
          ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Blockers</h2>
        {checkIn.blockers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nothing promoted from this check-in.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {checkIn.blockers.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span>{b.description}</span>
                <span className="text-gray-500">
                  {b.owner ? `Owner: ${b.owner.name}` : "No owner"}
                  {b.targetDate
                    ? ` · due ${b.targetDate.toISOString().slice(0, 10)}`
                    : ""}{" "}
                  · {b.status.toLowerCase().replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {promotableUsers.length > 0 &&
        checkIn.status !== "MISSED" &&
        checkIn.inTheWay?.trim() ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              await promoteBlockerAction(id, formData);
            }}
            className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-4"
          >
            <label className="grow text-xs font-medium text-gray-600">
              Promote to tracked blocker
              <input
                name="description"
                required
                defaultValue={checkIn.inTheWay ?? ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Owner
              <select
                name="ownerId"
                required
                className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
              >
                {promotableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Target date
              <input
                type="date"
                name="targetDate"
                className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-heya-blue px-3 py-2 text-sm font-medium text-white hover:bg-heya-blue-dark"
            >
              Promote
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-3">
        {view.canMarkDiscussion ? (
          <form
            action={async () => {
              "use server";
              await markDiscussionAction(id);
            }}
          >
            <button
              type="submit"
              className="rounded-lg bg-heya-purple px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              We&apos;ve had the conversation
            </button>
          </form>
        ) : null}
        {view.canAcknowledge ? (
          <form
            action={async () => {
              "use server";
              await acknowledgeAction(id);
            }}
          >
            <button
              type="submit"
              className="rounded-lg bg-heya-green px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Acknowledge — lock this week
            </button>
          </form>
        ) : null}
        {checkIn.status === "AWAITING_DISCUSSION" && !view.canMarkDiscussion ? (
          <p className="text-sm text-gray-500">
            Next: {checkIn.manager.name} marks the conversation as held.
          </p>
        ) : null}
        {checkIn.status === "AWAITING_ACKNOWLEDGEMENT" && !view.canAcknowledge ? (
          <p className="text-sm text-gray-500">
            Next: {checkIn.user.name} acknowledges to lock the week.
          </p>
        ) : null}
        {checkIn.status === "COMPLETE" ? (
          <p className="text-sm text-gray-500">
            Locked{" "}
            {checkIn.acknowledgedAt
              ? `on ${checkIn.acknowledgedAt.toISOString().slice(0, 10)}`
              : ""}
            . Corrections go through the amendment trail.
          </p>
        ) : null}
        {checkIn.status === "MISSED" && user.role === "ADMIN" ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              await reopenMissedAction(id, formData);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              name="reason"
              required
              placeholder="Reason for reopening (logged)"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Reopen missed week
            </button>
          </form>
        ) : null}
        {checkIn.status === "MISSED" && user.role !== "ADMIN" ? (
          <p className="text-sm text-gray-500">
            This week closed incomplete. It stays on the record; an admin can
            reopen it if there is a good reason.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
