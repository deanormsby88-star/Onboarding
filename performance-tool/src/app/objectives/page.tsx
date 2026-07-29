import { requireUser } from "@/lib/current-user";
import { objectivesFor } from "@/lib/objectives";
import { AppShell } from "@/components/app-shell";
import { ObjectivesView } from "@/components/objectives-view";

/** My development objectives (brief §7). */
export default async function ObjectivesPage() {
  const user = await requireUser();
  const objectives = await objectivesFor(user.id);

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">My development objectives</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        The &quot;Own development&quot; measure on your scorecard is rated
        against your current active objective.
      </p>
      <ObjectivesView subjectId={user.id} objectives={objectives} />
    </AppShell>
  );
}
