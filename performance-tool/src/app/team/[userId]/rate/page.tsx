import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  CheckInError,
  getCheckInView,
  getOrCreateWeeklyCheckIn,
} from "@/lib/checkins";
import { currentIsoWeek, formatWeekRange, weekLabel } from "@/lib/weeks";
import {
  MANAGER_NARRATIVE_FIELDS,
  toFormEntries,
  toFormPerspectives,
} from "@/lib/checkin-ui";
import { AppShell } from "@/components/app-shell";
import { CheckInForm } from "@/components/check-in-form";

/** The manager evaluation form for one report's current week. */
export default async function RatePersonPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const user = await requireUser();
  const { userId } = await params;
  const week = currentIsoWeek();

  let view;
  try {
    const checkIn = await getOrCreateWeeklyCheckIn(userId, week);
    view = await getCheckInView(checkIn.id, user);
  } catch (e) {
    if (e instanceof CheckInError) {
      return (
        <AppShell user={user}>
          <h1 className="text-2xl font-semibold">Rate</h1>
          <p className="mt-4 max-w-lg rounded-md bg-white p-4 text-sm text-gray-600 shadow-sm">
            {e.message}
          </p>
        </AppShell>
      );
    }
    throw e;
  }

  if (!view.isManager) notFound();
  if (!view.canEditManager) redirect(`/check-in/${view.checkIn.id}`);

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Rate {view.checkIn.user.name}</h1>
        <p className="text-sm text-gray-500">
          {weekLabel(week)} · {formatWeekRange(week)} ·{" "}
          <Link href="/team" className="text-heya-blue hover:underline">
            back to team
          </Link>
        </p>
      </div>
      <CheckInForm
        checkInId={view.checkIn.id}
        rater="MANAGER"
        subjectName={view.checkIn.user.name}
        perspectives={toFormPerspectives(view.scorecard)}
        initialEntries={toFormEntries(view.managerRatings ?? [])}
        narrativeFields={MANAGER_NARRATIVE_FIELDS}
        initialNarrative={{
          coachingNote: view.checkIn.coachingNote ?? "",
          agreedPriorities: view.checkIn.agreedPriorities ?? "",
        }}
      />
    </AppShell>
  );
}
