import { requireUser } from "@/lib/current-user";
import { getLiveScorecard, PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { AppShell } from "@/components/app-shell";

/** Read-only view of the signed-in user's live scorecard (brief §7). */
export default async function MyScorecardPage() {
  const user = await requireUser();
  const scorecard = await getLiveScorecard(user.id);

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">My scorecard</h1>
      {!scorecard ? (
        <p className="mt-4 text-sm text-gray-600">
          No scorecard assigned yet. Your manager or an admin sets this up —
          nothing for you to do.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            {scorecard.template?.name ?? "Custom scorecard"} · version{" "}
            {scorecard.version} · in force since{" "}
            {scorecard.effectiveFrom.toISOString().slice(0, 10)}
          </p>
          <div className="mt-6 space-y-6">
            {scorecard.perspectives.map((p) => (
              <section
                key={p.id}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <h2 className="flex items-baseline justify-between text-lg font-medium">
                  {PERSPECTIVE_LABEL[p.kind]}
                  <span className="text-sm font-normal text-gray-500">
                    {p.weightPct}%
                  </span>
                </h2>
                <ul className="mt-3 divide-y divide-gray-100">
                  {p.measures.map((mm) => (
                    <li key={mm.id} className="py-3">
                      <p className="font-medium">
                        <span className="mr-2 text-gray-400">{mm.code}</span>
                        {mm.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{mm.definition}</p>
                      <p className="mt-2 rounded-md bg-blue-50/60 px-3 py-2 text-sm text-gray-700">
                        <span className="font-medium text-heya-blue">
                          3 — meets standard:
                        </span>{" "}
                        {mm.anchor3}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
