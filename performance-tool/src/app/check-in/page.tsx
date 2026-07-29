import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  CheckInError,
  getOrCreateWeeklyCheckIn,
  getCheckInView,
} from "@/lib/checkins";
import { currentIsoWeek, formatWeekRange, weekLabel } from "@/lib/weeks";
import {
  SELF_NARRATIVE_FIELDS,
  toFormEntries,
  toFormPerspectives,
} from "@/lib/checkin-ui";
import { AppShell } from "@/components/app-shell";
import { CheckInForm } from "@/components/check-in-form";

/** "This week" — the self-evaluation form (brief §7). */
export default async function ThisWeekPage() {
  const user = await requireUser();
  const week = currentIsoWeek();

  let view;
  try {
    const checkIn = await getOrCreateWeeklyCheckIn(user.id, week);
    view = await getCheckInView(checkIn.id, user);
  } catch (e) {
    if (e instanceof CheckInError) {
      return (
        <AppShell user={user}>
          <h1 className="text-2xl font-semibold">This week</h1>
          <p className="mt-4 max-w-lg rounded-md bg-white p-4 text-sm text-gray-600 shadow-sm">
            {e.message}
          </p>
        </AppShell>
      );
    }
    throw e;
  }

  if (!view.canEditSelf) redirect(`/check-in/${view.checkIn.id}`);

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">This week</h1>
        <p className="text-sm text-gray-500">
          {weekLabel(week)} · {formatWeekRange(week)} ·{" "}
          <Link href="/history" className="text-heya-blue hover:underline">
            history
          </Link>
        </p>
      </div>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Rate your measures and submit by Friday. Your manager cannot see your
        ratings until they have submitted their own.
      </p>
      <CheckInForm
        checkInId={view.checkIn.id}
        rater="SELF"
        perspectives={toFormPerspectives(view.scorecard)}
        initialEntries={toFormEntries(view.selfRatings ?? [])}
        narrativeFields={SELF_NARRATIVE_FIELDS}
        initialNarrative={{
          winOfWeek: view.checkIn.winOfWeek ?? "",
          focusNextWeek: view.checkIn.focusNextWeek ?? "",
          inTheWay: view.checkIn.inTheWay ?? "",
          supportNeeded: view.checkIn.supportNeeded ?? "",
        }}
      />
    </AppShell>
  );
}
