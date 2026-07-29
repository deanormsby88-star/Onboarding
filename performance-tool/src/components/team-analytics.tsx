import Link from "next/link";
import type { TeamMemberAnalytics } from "@/lib/analytics";
import { PERSPECTIVE_LABEL, PERSPECTIVE_ORDER } from "@/lib/scorecards";
import { round1 } from "@/lib/scoring";

/**
 * Team analytics (brief §9): heatmap of current manager scores by
 * perspective, direction of travel, and the largest deltas ranked so the
 * conversations that need having surface themselves.
 */

const DIRECTION = {
  improving: { icon: "↑", label: "Improving", cls: "text-heya-green" },
  flat: { icon: "→", label: "Flat", cls: "text-gray-500" },
  declining: { icon: "↓", label: "Declining", cls: "text-red-600" },
  insufficient: { icon: "·", label: "Too little data", cls: "text-gray-400" },
} as const;

/** Sequential single-hue scale (manager purple), value printed in the cell. */
function heatStyle(score: number | null): React.CSSProperties {
  if (score == null) return { backgroundColor: "#f9fafb", color: "#9ca3af" };
  const t = Math.max(0, Math.min(1, (score - 1) / 4)); // 1..5 → 0..1
  const alpha = 0.08 + t * 0.85;
  return {
    backgroundColor: `rgba(139, 61, 175, ${alpha.toFixed(2)})`,
    color: alpha > 0.55 ? "#ffffff" : "#1f2937",
  };
}

export function TeamAnalyticsView({ team }: { team: TeamMemberAnalytics[] }) {
  const withDelta = team
    .filter((t) => t.latestDelta != null)
    .sort((a, b) => Math.abs(b.latestDelta!) - Math.abs(a.latestDelta!));

  return (
    <div className="mt-8 space-y-8">
      <section>
        <h2 className="text-lg font-medium">Team heatmap</h2>
        <p className="mt-1 text-sm text-gray-600">
          Latest fully-submitted week&apos;s manager scores by perspective.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-2.5 font-medium">Person</th>
                {PERSPECTIVE_ORDER.map((k) => (
                  <th key={k} className="px-3 py-2.5 text-center font-medium">
                    {PERSPECTIVE_LABEL[k].split(" and ")[0]}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {team.map((t) => {
                const d = DIRECTION[t.direction];
                return (
                  <tr key={t.userId} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/team/${t.userId}`}
                        className="font-medium hover:text-heya-blue hover:underline"
                      >
                        {t.name}
                      </Link>
                    </td>
                    {t.heatmap.map((score, i) => (
                      <td key={i} className="px-1 py-1 text-center">
                        <span
                          className="inline-flex h-9 w-full min-w-14 items-center justify-center rounded font-semibold tabular-nums"
                          style={heatStyle(score)}
                        >
                          {round1(score)}
                        </span>
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-center font-medium ${d.cls}`}>
                      <span aria-hidden>{d.icon}</span> {d.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium">Largest deltas</h2>
          <p className="mt-1 text-sm text-gray-600">
            The conversations that need having, biggest gap first.
          </p>
          <ul className="mt-3 space-y-2">
            {withDelta.length === 0 ? (
              <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                No fully-submitted weeks yet.
              </li>
            ) : (
              withDelta.map((t) => (
                <li
                  key={t.userId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
                >
                  <Link
                    href={`/team/${t.userId}`}
                    className="font-medium hover:text-heya-blue hover:underline"
                  >
                    {t.name}
                  </Link>
                  <span className="tabular-nums">
                    <span className="text-heya-purple">{round1(t.latestManagerScore)}</span>
                    <span className="mx-2 text-gray-400">·</span>
                    <span
                      className={
                        Math.abs(t.latestDelta!) >= 1.5
                          ? "font-semibold text-red-600"
                          : Math.abs(t.latestDelta!) >= 0.7
                            ? "font-semibold text-amber-600"
                            : "text-gray-600"
                      }
                    >
                      {t.latestDelta! > 0 ? "+" : ""}
                      {(Math.round(t.latestDelta! * 10) / 10).toFixed(1)} delta
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium">Participation</h2>
          <p className="mt-1 text-sm text-gray-600">
            Missed weeks stay on the record — participation data is
            performance data.
          </p>
          <ul className="mt-3 space-y-2">
            {team.map((t) => (
              <li
                key={t.userId}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span>{t.name}</span>
                <span className="tabular-nums text-gray-600">
                  {t.participation.completed}/{t.participation.total} weeks
                  {t.participation.missed > 0 ? (
                    <span className="ml-2 text-red-600">
                      {t.participation.missed} missed
                    </span>
                  ) : null}
                  {t.openBlockers > 0 ? (
                    <span className="ml-2 text-amber-600">
                      {t.openBlockers} open blocker{t.openBlockers === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
