import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { EntryRow, WalkRow } from "./db";
import type { Room } from "./floorplan";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;

const INK = rgb(0.13, 0.15, 0.19);
const MUTED = rgb(0.45, 0.48, 0.55);
const ACCENT = rgb(0.09, 0.4, 0.75);
const RED = rgb(0.75, 0.15, 0.15);
const AMBER = rgb(0.8, 0.5, 0.05);
const GREEN = rgb(0.1, 0.55, 0.25);

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function need(ctx: Ctx, height: number) {
  if (ctx.y - height < MARGIN) newPage(ctx);
}

function text(
  ctx: Ctx,
  str: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}
) {
  const size = opts.size ?? 10;
  need(ctx, size + 4);
  ctx.page.drawText(str, {
    x: opts.x ?? MARGIN,
    y: ctx.y - size,
    size,
    font: opts.bold ? ctx.bold : ctx.font,
    color: opts.color ?? INK,
  });
  ctx.y -= size + 4;
}

function wrap(font: PDFFont, str: string, size: number, maxWidth: number): string[] {
  const words = str.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function sanitize(str: string): string {
  // WinAnsi-safe: strip characters the standard fonts can't encode
  return str.replace(/[^\x20-\x7E -ÿ]/g, "?");
}

const PRESENCE_LABEL: Record<string, string> = {
  present: "Present",
  break: "On break",
  absent: "Absent",
  not_started: "Shift not started",
};

const CATEGORY_LABEL: Record<string, string> = {
  follow_up: "Follow-up",
  hr: "HR intervention",
};

export function presenceLabel(p: string): string {
  return PRESENCE_LABEL[p] ?? p;
}

export function categoryLabel(c: string | null): string {
  return c ? CATEGORY_LABEL[c] ?? c : "";
}

// The current floor plan (with corrections and new starters) as a printable
// room-by-room roster.
export async function buildFloorPlanPdf(
  rooms: Room[],
  names: Record<number, string>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN, font, bold };

  const now = new Date().toLocaleString("en-ZA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: process.env.REPORT_TIMEZONE || "Africa/Johannesburg",
  });
  const totalPeople = rooms.reduce((n, r) => n + r.employeeNumbers.length, 0);

  text(ctx, "Floor Plan - Current Room Assignments", { size: 20, bold: true, color: ACCENT });
  text(ctx, `Generated ${now}`, { size: 10, color: MUTED });
  text(
    ctx,
    `${rooms.length} rooms  |  ${totalPeople} people  |  includes all corrections and new starters recorded during floor walks`,
    { size: 10, color: MUTED }
  );
  ctx.y -= 10;

  for (const room of rooms) {
    need(ctx, 46);
    ctx.y -= 6;
    text(ctx, `${sanitize(room.name)}  (${room.employeeNumbers.length})`, { size: 12.5, bold: true });
    if (room.employeeNumbers.length === 0) {
      text(ctx, "No one assigned", { size: 9.5, x: MARGIN + 12, color: MUTED });
      continue;
    }
    for (const num of room.employeeNumbers) {
      need(ctx, 14);
      ctx.page.drawText(`#${String(num).padStart(3, " ")}`, {
        x: MARGIN + 12,
        y: ctx.y - 10,
        size: 9.5,
        font: bold,
        color: MUTED,
      });
      ctx.page.drawText(sanitize(names[num] ?? `Employee #${num}`), {
        x: MARGIN + 52,
        y: ctx.y - 10,
        size: 9.5,
        font,
        color: INK,
      });
      ctx.y -= 13;
    }
  }

  return doc.save();
}

export async function buildWalkPdf(walk: WalkRow, entries: EntryRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN, font, bold };

  const started = new Date(walk.started_at);
  const submitted = walk.submitted_at ? new Date(walk.submitted_at) : null;
  const fmt = (d: Date) =>
    d.toLocaleString("en-ZA", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: process.env.REPORT_TIMEZONE || "Africa/Johannesburg",
    });

  // Header
  text(ctx, "Floor Walk Report", { size: 22, bold: true, color: ACCENT });
  ctx.y -= 4;
  text(ctx, `Walk #${walk.id}  -  conducted by ${sanitize(walk.walker)}`, { size: 12, bold: true });
  text(ctx, `Started:   ${fmt(started)}`, { size: 10, color: MUTED });
  if (submitted) text(ctx, `Submitted: ${fmt(submitted)}`, { size: 10, color: MUTED });
  ctx.y -= 8;

  // Summary counts
  const counts = { present: 0, break: 0, absent: 0, not_started: 0 };
  for (const e of entries) {
    if (e.presence in counts) counts[e.presence as keyof typeof counts]++;
  }
  const notes = entries.filter((e) => e.note && e.note.trim().length > 0);
  text(
    ctx,
    `Summary: ${entries.length} people checked  |  ${counts.present} present  |  ${counts.break} on break  |  ${counts.absent} absent  |  ${counts.not_started} shift not started  |  ${notes.length} note${notes.length === 1 ? "" : "s"}`,
    { size: 11, bold: true }
  );
  ctx.y -= 10;

  // Notes section first (the actionable part)
  if (notes.length > 0) {
    text(ctx, "Notes & follow-ups", { size: 14, bold: true, color: RED });
    ctx.y -= 2;
    for (const e of notes) {
      const cat = categoryLabel(e.note_category);
      const head = `${sanitize(e.employee_name)} (#${e.employee_number}) - ${sanitize(e.room_name)}${cat ? ` - [${cat}]` : ""}`;
      need(ctx, 40);
      text(ctx, head, { size: 10.5, bold: true });
      for (const line of wrap(font, sanitize(e.note!.trim()), 10, PAGE_W - MARGIN * 2 - 12)) {
        text(ctx, line, { size: 10, x: MARGIN + 12, color: INK });
      }
      ctx.y -= 6;
    }
    ctx.y -= 8;
  }

  // Room-by-room detail
  text(ctx, "Room-by-room detail", { size: 14, bold: true, color: ACCENT });
  ctx.y -= 2;

  const byRoom = new Map<string, EntryRow[]>();
  for (const e of entries) {
    const list = byRoom.get(e.room_name) ?? [];
    list.push(e);
    byRoom.set(e.room_name, list);
  }

  for (const [roomName, roomEntries] of byRoom) {
    need(ctx, 50);
    ctx.y -= 6;
    text(ctx, sanitize(roomName), { size: 12, bold: true });
    for (const e of roomEntries) {
      const color =
        e.presence === "present" ? GREEN : e.presence === "break" ? AMBER : e.presence === "not_started" ? MUTED : RED;
      need(ctx, 16);
      const label = PRESENCE_LABEL[e.presence] ?? e.presence;
      ctx.page.drawText(label, {
        x: MARGIN + 12,
        y: ctx.y - 10,
        size: 9.5,
        font: bold,
        color,
      });
      ctx.page.drawText(`${sanitize(e.employee_name)} (#${e.employee_number})${e.note ? "  *" : ""}`, {
        x: MARGIN + 100,
        y: ctx.y - 10,
        size: 9.5,
        font,
        color: INK,
      });
      ctx.y -= 14;
    }
  }

  ctx.y -= 10;
  text(ctx, "* has a note - see Notes & follow-ups above", { size: 8.5, color: MUTED });

  return doc.save();
}
