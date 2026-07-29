import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { AppShell } from "@/components/app-shell";

const SECTIONS = [
  ["/admin/users", "Users", "People, roles, reporting lines, deactivation."],
  ["/admin/templates", "Templates", "Build and edit scorecard templates."],
  ["/admin/assign", "Assign scorecards", "Assign templates; versions and effective dates."],
  ["/admin/calibration", "Calibration", "Generous and harsh raters, ranked averages, delta spread."],
  ["/admin/pips", "PIPs", "Performance improvement plans with the full evidence chain."],
  ["/admin/access-log", "Access log", "Who viewed whose record (POPIA accountability)."],
  ["/admin/settings", "Settings", "Notification cadence and retention."],
] as const;

export default async function AdminHubPage() {
  const admin = await requireAdmin();
  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(([href, title, blurb]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-heya-purple"
          >
            <p className="font-medium text-heya-purple">{title}</p>
            <p className="mt-1 text-sm text-gray-600">{blurb}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
