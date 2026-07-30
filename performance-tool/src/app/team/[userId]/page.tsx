import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AccessDeniedError, assertCanViewUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { getLiveScorecard } from "@/lib/scorecards";
import { AppShell } from "@/components/app-shell";
import { CheckInList } from "@/components/check-in-list";
import { individualAnalytics } from "@/lib/analytics";
import { IndividualAnalyticsView } from "@/components/individual-analytics";
import { objectivesFor } from "@/lib/objectives";
import { ObjectivesView } from "@/components/objectives-view";
import { pipInclude } from "@/lib/pips";
import { PipView } from "@/components/pip-view";

/** Person view: one report's full record (brief §7). */
export default async function PersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const viewer = await requireUser();
  const { userId } = await params;

  try {
    await assertCanViewUser(viewer, userId, "person_view");
  } catch (e) {
    if (e instanceof AccessDeniedError) notFound();
    throw e;
  }

  const person = await db.user.findUnique({ where: { id: userId } });
  if (!person) notFound();

  const [checkIns, scorecard, blockers, analytics, objectives] = await Promise.all([
    db.checkIn.findMany({
      where: { userId },
      orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
    }),
    getLiveScorecard(userId),
    db.blocker.findMany({
      where: { userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    individualAnalytics(userId),
    objectivesFor(userId),
  ]);
  const pips = await db.pip.findMany({
    where: { userId, status: { not: "DRAFT" } },
    include: pipInclude,
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={viewer}>
      <h1 className="text-2xl font-semibold">{person.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {person.jobTitle ?? "—"} ·{" "}
        {scorecard
          ? `${scorecard.template?.name ?? "Custom scorecard"} v${scorecard.version}`
          : "No scorecard assigned"}{" "}
        ·{" "}
        <a
          href={`/api/export/${person.id}`}
          className="text-heya-blue hover:underline"
        >
          export record (PDF)
        </a>
        {scorecard ? (
          <>
            {" "}
            ·{" "}
            <a
              href={`/api/scorecard/${person.id}/pdf`}
              className="text-heya-blue hover:underline"
            >
              scorecard (PDF)
            </a>
          </>
        ) : null}
      </p>

      {blockers.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-medium">Open blockers</h2>
          <ul className="mt-2 space-y-2">
            {blockers.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span>{b.description}</span>
                <span className="text-gray-500">
                  {b.owner ? `Owner: ${b.owner.name}` : "No owner"}
                  {b.targetDate
                    ? ` · due ${b.targetDate.toISOString().slice(0, 10)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-medium">Progress</h2>
        <div className="mt-3">
          <IndividualAnalyticsView data={analytics} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Check-ins</h2>
        <CheckInList checkIns={checkIns} />
      </section>

      {pips.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Performance improvement plan</h2>
          <p className="mt-1 text-sm text-gray-600">
            Visible to {person.name.split(" ")[0]} in their own app under
            &quot;My PIP&quot; — the process is transparent by design.
          </p>
          <div className="mt-3 space-y-8">
            {pips.map((pip) => (
              <PipView key={pip.id} pip={pip} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Development objectives</h2>
        <div className="mt-3">
          <ObjectivesView subjectId={person.id} objectives={objectives} />
        </div>
      </section>
    </AppShell>
  );
}
