import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { CheckInList } from "@/components/check-in-list";

export default async function HistoryPage() {
  const user = await requireUser();
  const checkIns = await db.checkIn.findMany({
    where: { userId: user.id },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
  });

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">My history</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every week on the record — including missed ones. Participation data
        is performance data.
      </p>
      <CheckInList checkIns={checkIns} />
    </AppShell>
  );
}
