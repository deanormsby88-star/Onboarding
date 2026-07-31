import { NextResponse } from "next/server";
import { z } from "zod";
import {
  entraTokenEndpoint,
  getDelegatedConnection,
  saveDelegatedConnection,
} from "@/lib/mail";
import { decryptSecret } from "@/lib/crypto";

/**
 * Create recurring check-in meetings in the connected mailbox's calendar
 * via Microsoft Graph. Graph sends real invites to the attendees, so this
 * replaces hand-building Outlook series. CRON_SECRET-protected; requires
 * the mailbox connection to have been made AFTER Calendars.ReadWrite was
 * added to the connect scopes (reconnect under Admin → Settings if not).
 *
 * POST body: { "events": [{ subject, attendees: ["a@x"], weekday: "friday",
 *   startTime: "13:00", endTime: "13:20", firstDate: "2026-08-14",
 *   body?: "..." }] }
 */

const eventSchema = z.object({
  subject: z.string().min(1),
  attendees: z.array(z.string().email()).min(1),
  /** Omit weekday for a one-off event on firstDate. */
  weekday: z
    .enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ])
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  firstDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().optional(),
});

const payloadSchema = z.object({ events: z.array(eventSchema).min(1).max(25) });

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const conn = await getDelegatedConnection();
  if (!conn) {
    return NextResponse.json(
      { error: "no mailbox connected (Admin → Settings → Notification mailbox)" },
      { status: 409 }
    );
  }

  // Refresh, explicitly requesting the calendar scope. Fails cleanly if the
  // connection predates the Calendars.ReadWrite consent.
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
      {
        error:
          "calendar permission not granted — disconnect and reconnect the mailbox under Admin → Settings, approving the calendar consent",
        detail: (await tokenRes.text()).slice(0, 300),
      },
      { status: 409 }
    );
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!tokens.scope?.includes("Calendars.ReadWrite")) {
    return NextResponse.json(
      {
        error:
          "the stored connection has no calendar permission — disconnect and reconnect the mailbox under Admin → Settings",
      },
      { status: 409 }
    );
  }
  if (tokens.refresh_token) {
    await saveDelegatedConnection({
      email: conn.email,
      connectedByName: conn.connectedByName,
      refreshToken: tokens.refresh_token,
    });
  }

  const results: { subject: string; status: string }[] = [];
  for (const ev of parsed.data.events) {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: ev.subject,
        body: {
          contentType: "text",
          content:
            ev.body ??
            "Weekly Heya Performance check-in conversation. Open the week's reveal beforehand: https://heya-performance.vercel.app",
        },
        start: {
          dateTime: `${ev.firstDate}T${ev.startTime}:00`,
          timeZone: "South Africa Standard Time",
        },
        end: {
          dateTime: `${ev.firstDate}T${ev.endTime}:00`,
          timeZone: "South Africa Standard Time",
        },
        attendees: ev.attendees.map((address) => ({
          emailAddress: { address },
          type: "required",
        })),
        ...(ev.weekday
          ? {
              recurrence: {
                pattern: {
                  type: "weekly",
                  interval: 1,
                  daysOfWeek: [ev.weekday],
                },
                range: { type: "noEnd", startDate: ev.firstDate },
              },
            }
          : {}),
        isReminderOn: true,
        reminderMinutesBeforeStart: 10,
      }),
    });
    results.push({
      subject: ev.subject,
      status: res.ok ? "created" : `error ${res.status}: ${(await res.text()).slice(0, 200)}`,
    });
  }

  return NextResponse.json({ results });
}
