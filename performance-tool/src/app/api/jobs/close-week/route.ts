import { NextResponse } from "next/server";
import { closeOutWeek } from "@/lib/checkins";
import { currentIsoWeek, previousWeek, weekLabel } from "@/lib/weeks";

/**
 * Scheduled close-out (brief §5): run just after Sunday 23:59 SAST — i.e.
 * early Monday — to mark the JUST-ENDED week's incomplete check-ins as
 * missed. Wire to an Azure scheduled job / cron:
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/jobs/close-week
 *
 * Optional ?week=2026-W31 closes a specific week instead.
 *
 * Vercel cron invokes with GET and supplies the same Authorization header
 * automatically from the CRON_SECRET env var; both methods are accepted.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const param = url.searchParams.get("week");
  let week = previousWeek(currentIsoWeek());
  if (param) {
    const match = /^(\d{4})-W(\d{2})$/.exec(param);
    if (!match) {
      return NextResponse.json(
        { error: "week must look like 2026-W31" },
        { status: 400 }
      );
    }
    week = { isoYear: Number(match[1]), isoWeek: Number(match[2]) };
  }

  const { missed } = await closeOutWeek(week);
  return NextResponse.json({ week: weekLabel(week), missed });
}

export { handle as GET, handle as POST };
