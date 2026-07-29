import { NextResponse } from "next/server";
import { runDueNotifications } from "@/lib/notifications";

/**
 * Hourly notification runner. Schedule with cron at minute 0 every hour:
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/jobs/notifications
 *
 * Which rules fire is decided by the config-driven schedule (Admin →
 * app_settings.notification_schedule), evaluated in SAST.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const summary = await runDueNotifications();
  return NextResponse.json({ ran: Object.keys(summary), summary });
}
