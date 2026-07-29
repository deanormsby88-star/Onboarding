import { requireUser } from "@/lib/current-user";
import { individualAnalytics } from "@/lib/analytics";
import { AppShell } from "@/components/app-shell";
import { IndividualAnalyticsView } from "@/components/individual-analytics";

/** My progress — own analytics (brief §7/§9). */
export default async function ProgressPage() {
  const user = await requireUser();
  const data = await individualAnalytics(user.id);

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">My progress</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Scores appear for weeks where both you and your manager submitted.
      </p>
      <IndividualAnalyticsView data={data} />
    </AppShell>
  );
}
