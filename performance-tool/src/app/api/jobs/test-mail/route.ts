import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";

/**
 * One-shot Graph mail test, protected by CRON_SECRET:
 *   POST /api/jobs/test-mail?to=someone@heya.team
 * Returns "sent", "skipped" (Graph env vars not configured), or the
 * sanitised Graph error so misconfiguration is diagnosable without logs.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const to = new URL(request.url).searchParams.get("to");
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "pass ?to=address" }, { status: 400 });
  }
  try {
    const result = await sendMail({
      to,
      subject: "Heya Performance — test email",
      bodyText:
        "This is the notification test for Heya Performance. If you are reading this, Graph mail is configured correctly and the scheduled notifications will flow.\n\nNo action needed.",
    });
    return NextResponse.json({ result });
  } catch (e) {
    const detail =
      e instanceof Error ? e.message.slice(0, 500) : "unknown error";
    return NextResponse.json({ result: "error", detail }, { status: 502 });
  }
}

export { handle as GET, handle as POST };
