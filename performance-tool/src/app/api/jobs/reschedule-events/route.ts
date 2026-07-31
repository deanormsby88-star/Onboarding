import { NextResponse } from "next/server";
import { z } from "zod";
import {
  entraTokenEndpoint,
  getDelegatedConnection,
  saveDelegatedConnection,
} from "@/lib/mail";
import { decryptSecret } from "@/lib/crypto";

/**
 * Move calendar events the connected mailbox organises, matched by exact
 * subject on a given day. Graph PATCH on the organiser's event sends the
 * update to all attendees automatically. CRON_SECRET-protected.
 *
 * POST body: { "items": [{ subject, date: "2026-08-03",
 *   startTime: "10:30", endTime: "11:00" }] }
 */

const itemSchema = z.object({
  subject: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  /** Mark the organiser's copy as non-blocking (attendees stay busy). */
  showAsFree: z.boolean().optional(),
});
const payloadSchema = z.object({ items: z.array(itemSchema).min(1).max(25) });

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const conn = await getDelegatedConnection();
  if (!conn) {
    return NextResponse.json({ error: "no mailbox connected" }, { status: 409 });
  }

  const tokenRes = await fetch(entraTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: decryptSecret(conn.refreshTokenEnc),
      scope:
        "openid offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.ReadWrite",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "token refresh failed — reconnect the mailbox" },
      { status: 409 }
    );
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  if (tokens.refresh_token) {
    await saveDelegatedConnection({
      email: conn.email,
      connectedByName: conn.connectedByName,
      refreshToken: tokens.refresh_token,
    });
  }
  const auth = { Authorization: `Bearer ${tokens.access_token}` };

  const results: { subject: string; status: string }[] = [];
  for (const item of parsed.data.items) {
    const view = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${item.date}T00:00:00&endDateTime=${item.date}T23:59:59&$top=50&$select=id,subject,type,seriesMasterId`,
      { headers: { ...auth, Prefer: 'outlook.timezone="South Africa Standard Time"' } }
    );
    if (!view.ok) {
      results.push({ subject: item.subject, status: `lookup failed ${view.status}` });
      continue;
    }
    const events = ((await view.json()) as {
      value: { id: string; subject: string; type: string }[];
    }).value.filter((e) => e.subject === item.subject);
    if (events.length !== 1) {
      results.push({
        subject: item.subject,
        status: `expected exactly 1 match on ${item.date}, found ${events.length} — not touched`,
      });
      continue;
    }
    const patch = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${events[0]!.id}`,
      {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          start: {
            dateTime: `${item.date}T${item.startTime}:00`,
            timeZone: "South Africa Standard Time",
          },
          end: {
            dateTime: `${item.date}T${item.endTime}:00`,
            timeZone: "South Africa Standard Time",
          },
          ...(item.showAsFree ? { showAs: "free" } : {}),
        }),
      }
    );
    results.push({
      subject: item.subject,
      status: patch.ok
        ? `moved to ${item.startTime}-${item.endTime}`
        : `patch failed ${patch.status}: ${(await patch.text()).slice(0, 150)}`,
    });
  }
  return NextResponse.json({ results });
}
