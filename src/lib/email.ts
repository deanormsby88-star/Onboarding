import nodemailer from "nodemailer";
import type { EntryRow, WalkRow } from "./db";
import { categoryLabel, presenceLabel } from "./pdf";

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function recipients(): string[] {
  return (process.env.REPORT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildEmailBody(walk: WalkRow, entries: EntryRow[]): { html: string; text: string } {
  const notes = entries.filter((e) => e.note && e.note.trim().length > 0);
  const counts = { present: 0, break: 0, absent: 0, not_started: 0 };
  for (const e of entries) {
    if (e.presence in counts) counts[e.presence as keyof typeof counts]++;
  }
  const when = new Date(walk.submitted_at ?? walk.started_at).toLocaleString("en-ZA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: process.env.REPORT_TIMEZONE || "Africa/Johannesburg",
  });

  const noteLinesText = notes.length
    ? notes
        .map((e) => {
          const cat = categoryLabel(e.note_category);
          return `- ${e.employee_name} (#${e.employee_number}), ${e.room_name}${cat ? ` [${cat}]` : ""} (${presenceLabel(e.presence)}):\n  ${e.note!.trim()}`;
        })
        .join("\n\n")
    : "No notes were recorded on this walk.";

  const text = [
    `Floor walk #${walk.id} completed by ${walk.walker}`,
    `${when}`,
    ``,
    `Summary: ${entries.length} people checked | ${counts.present} present | ${counts.break} on break | ${counts.absent} absent | ${counts.not_started} shift not started`,
    ``,
    `NOTES & FOLLOW-UPS`,
    noteLinesText,
    ``,
    `The full room-by-room report is attached as a PDF.`,
  ].join("\n");

  const noteRowsHtml = notes.length
    ? notes
        .map((e) => {
          const cat = categoryLabel(e.note_category);
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;white-space:nowrap;">
              <strong>${esc(e.employee_name)}</strong><br/>
              <span style="color:#6b7280;font-size:12px;">#${e.employee_number} &middot; ${esc(e.room_name)}</span>
              ${cat ? `<br/><span style="color:#b91c1c;font-size:12px;font-weight:bold;">${esc(cat)}</span>` : ""}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">${esc(e.note!.trim())}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td style="padding:8px 12px;color:#6b7280;">No notes were recorded on this walk.</td></tr>`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:640px;">
    <h2 style="color:#1d4ed8;margin-bottom:4px;">Floor Walk Report</h2>
    <p style="margin:4px 0;"><strong>Walk #${walk.id}</strong> completed by <strong>${esc(walk.walker)}</strong><br/>
    <span style="color:#6b7280;">${esc(when)}</span></p>
    <p style="margin:12px 0;">
      <strong>${entries.length}</strong> people checked &nbsp;|&nbsp;
      <span style="color:#15803d;"><strong>${counts.present}</strong> present</span> &nbsp;|&nbsp;
      <span style="color:#b45309;"><strong>${counts.break}</strong> on break</span> &nbsp;|&nbsp;
      <span style="color:#b91c1c;"><strong>${counts.absent}</strong> absent</span> &nbsp;|&nbsp;
      <span style="color:#475569;"><strong>${counts.not_started}</strong> shift not started</span>
    </p>
    <h3 style="margin:16px 0 8px;color:#b91c1c;">Notes &amp; follow-ups</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">${noteRowsHtml}</table>
    <p style="color:#6b7280;font-size:13px;margin-top:16px;">The full room-by-room report is attached as a PDF.</p>
  </div>`;

  return { html, text };
}

export async function sendWalkReport(
  walk: WalkRow,
  entries: EntryRow[],
  pdf: Uint8Array
): Promise<{ sent: boolean; detail: string }> {
  if (!emailConfigured()) {
    return { sent: false, detail: "SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS)" };
  }
  const to = recipients();
  if (to.length === 0) {
    return { sent: false, detail: "No recipients configured (set REPORT_RECIPIENTS)" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const { html, text } = buildEmailBody(walk, entries);
  const dateStr = new Date(walk.submitted_at ?? walk.started_at)
    .toLocaleDateString("en-ZA", { timeZone: process.env.REPORT_TIMEZONE || "Africa/Johannesburg" });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Floor Walk Report - ${walk.walker} - ${dateStr}`,
    text,
    html,
    attachments: [
      {
        filename: `floor-walk-${walk.id}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });

  return { sent: true, detail: `Sent to ${to.join(", ")}` };
}
