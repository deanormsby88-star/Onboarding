import { requireAdmin } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { AssignForm } from "@/components/assign-form";

export default async function AssignPage() {
  const admin = await requireAdmin();

  const [users, templates] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        scorecards: {
          where: { effectiveTo: null },
          orderBy: { version: "desc" },
          take: 1,
          include: { template: { select: { name: true } } },
        },
      },
    }),
    db.scorecardTemplate.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AppShell user={admin}>
      <h1 className="text-2xl font-semibold">Assign scorecards</h1>
      <p className="mt-1 text-sm text-gray-600">
        Assigning copies the template into a new scorecard version for that
        person as of the effective date. The previous version is closed, and
        past check-ins stay attached to it.
      </p>

      <div className="mt-6 space-y-3">
        {users.map((u) => {
          const live = u.scorecards[0];
          return (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-gray-600">
                  {live
                    ? `${live.template?.name ?? "Custom scorecard"} · v${live.version} · since ${live.effectiveFrom.toISOString().slice(0, 10)}`
                    : "No scorecard assigned"}
                </p>
              </div>
              <AssignForm userId={u.id} templates={templates} />
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
