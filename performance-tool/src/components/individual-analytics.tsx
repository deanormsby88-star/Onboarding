import type { IndividualAnalytics } from "@/lib/analytics";
import { round1 } from "@/lib/scoring";
import { DeltaOverTime, PerspectiveBars, ScoreOverTime } from "@/components/charts";

/** The individual analytics block (brief §9), shared by My progress and the person view. */
export function IndividualAnalyticsView({ data }: { data: IndividualAnalytics }) {
  const { points, participation, perspectives } = data;
  const scored = points.filter((p) => p.self != null || p.manager != null);

  if (scored.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        No completed check-ins yet — charts appear once both sides of a week
        have been submitted.
      </p>
    );
  }

  const latest = [...points].reverse().find((p) => p.delta != null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile
          label="Latest delta"
          value={
            latest?.delta == null
              ? "—"
              : `${latest.delta > 0 ? "+" : ""}${(Math.round(latest.delta * 10) / 10).toFixed(1)}`
          }
          hint="self − manager"
        />
        <StatTile
          label="Weeks completed"
          value={`${participation.completed}/${participation.total}`}
        />
        <StatTile label="Weeks missed" value={String(participation.missed)} />
        <StatTile
          label="Current streak"
          value={String(participation.currentStreak)}
          hint="consecutive weeks"
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Overall score over time —{" "}
          <span className="text-heya-blue">self</span> vs{" "}
          <span className="text-heya-purple">manager</span>
        </h3>
        <ScoreOverTime points={points} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Delta over time
            <span className="ml-2 font-normal text-gray-500">
              persistently above zero is a coaching signal
            </span>
          </h3>
          <DeltaOverTime points={points} />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Latest week by perspective
          </h3>
          {perspectives.length > 0 ? (
            <PerspectiveBars rows={perspectives} />
          ) : (
            <p className="text-sm text-gray-500">Nothing submitted yet.</p>
          )}
        </section>
      </div>

      <details className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-gray-700">
          Data table (all weeks)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-1.5 pr-4 font-medium">Week</th>
                <th className="py-1.5 pr-4 font-medium">Self</th>
                <th className="py-1.5 pr-4 font-medium">Manager</th>
                <th className="py-1.5 pr-4 font-medium">Delta</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.week} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-4">{p.week}</td>
                  <td className="py-1.5 pr-4 text-heya-blue">{round1(p.self)}</td>
                  <td className="py-1.5 pr-4 text-heya-purple">{round1(p.manager)}</td>
                  <td className="py-1.5 pr-4">
                    {p.delta == null
                      ? "—"
                      : `${p.delta > 0 ? "+" : ""}${(Math.round(p.delta * 10) / 10).toFixed(1)}`}
                  </td>
                  <td className="py-1.5 text-gray-600">{p.status.toLowerCase().replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
