import { requireAdmin } from "@/lib/current-user";
import { calibrationData } from "@/lib/analytics";
import { round1 } from "@/lib/scoring";
import { AppShell } from "@/components/app-shell";
import { DeltaRanking, RatingHistogram } from "@/components/charts";

/**
 * Admin calibration (brief §9): catches the generous rater and the harsh
 * rater — the main fairness risk in a two-rater system. Deliberately no
 * single composite "company performance score".
 */
export default async function CalibrationPage() {
  const admin = await requireAdmin();
  const { histograms, ranked, deltas } = await calibrationData();

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Calibration</h1>
      <p className="mt-1 text-sm text-gray-600">
        How each manager uses the 1–5 scale, side by side. A distribution
        piled up on 4–5 is a generous rater; piled on 1–2 is a harsh one.
        Neither means their people perform differently.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Rating distribution per manager</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {histograms.length === 0 ? (
            <p className="text-sm text-gray-500">No manager ratings yet.</p>
          ) : (
            histograms.map((h) => (
              <div key={h.manager} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium">{h.manager}</p>
                <p className="text-xs text-gray-500">{h.total} ratings given</p>
                <RatingHistogram counts={h.counts} total={h.total} />
              </div>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium">Average manager score per person</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-4 py-2.5 font-medium">Manager</th>
                  <th className="px-4 py-2.5 text-right font-medium">Avg score</th>
                  <th className="px-4 py-2.5 text-right font-medium">Weeks</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-gray-600">{r.manager}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-heya-purple">
                      {round1(r.avg)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                      {r.weeks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Read this alongside the distributions above — a low average under a
            harsh rater is not the same thing as a low performer.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">Self-vs-manager delta across the org</h2>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
            {deltas.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <DeltaRanking rows={deltas} />
            )}
            <p className="mt-2 text-xs text-gray-500">
              Positive (blue, self-side) = rates themselves above their
              manager. Negative (purple, manager-side) = manager rates them
              higher than they rate themselves.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
