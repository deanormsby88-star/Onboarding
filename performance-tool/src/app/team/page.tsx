import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/checkins";
import { currentIsoWeek, formatWeekRange, weekLabel } from "@/lib/weeks";
import { AppShell } from "@/components/app-shell";
import { teamAnalytics } from "@/lib/analytics";
import { TeamAnalyticsView } from "@/components/team-analytics";

/** Manager landing page: one row per direct report (brief §7). */
export default async function TeamPage() {
  const user = await requireUser();
  const week = currentIsoWeek();

  const reports = await db.user.findMany({
    where: { managerId: user.id, isActive: true },
    orderBy: { name: "asc" },
    include: {
      checkIns: {
        where: { isoYear: week.isoYear, isoWeek: week.isoWeek, type: "WEEKLY" },
        take: 1,
      },
      blockersRaised: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
    },
  });
  if (reports.length === 0) redirect("/check-in");
  const analytics = await teamAnalytics(user.id);

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">My team</h1>
        <p className="text-sm text-gray-500">
          {weekLabel(week)} · {formatWeekRange(week)}
        </p>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Your own check-in is under{" "}
        <Link href="/check-in" className="text-heya-blue hover:underline">
          This week
        </Link>
        .
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium">This week</th>
              <th className="px-4 py-2.5 font-medium">Their side</th>
              <th className="px-4 py-2.5 font-medium">Your side</th>
              <th className="px-4 py-2.5 font-medium">Open blockers</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const ci = r.checkIns[0];
              return (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/team/${r.id}`}
                      className="hover:text-heya-blue hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {ci ? STATUS_LABEL[ci.status] : "Not started"}
                  </td>
                  <td className="px-4 py-3">
                    {ci?.selfSubmittedAt ? (
                      <span className="text-heya-green">Submitted ✓</span>
                    ) : (
                      <span className="text-gray-400">Waiting</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ci?.managerSubmittedAt ? (
                      <span className="text-heya-green">Submitted ✓</span>
                    ) : (
                      <Link
                        href={`/team/${r.id}/rate`}
                        className="font-medium text-heya-purple hover:underline"
                      >
                        Rate {r.name.split(" ")[0]} →
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.blockersRaised.length > 0 ? (
                      <span className="text-amber-600">{r.blockersRaised.length}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ci ? (
                      <Link
                        href={`/check-in/${ci.id}`}
                        className="text-heya-blue hover:underline"
                      >
                        View
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TeamAnalyticsView team={analytics} />
    </AppShell>
  );
}
