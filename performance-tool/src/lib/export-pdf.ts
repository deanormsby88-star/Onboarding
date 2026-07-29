import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/lib/db";
import { amendmentsForCheckIn } from "@/lib/amendments";
import { PERSPECTIVE_LABEL } from "@/lib/scorecards";
import { STATUS_LABEL, checkInInclude } from "@/lib/checkins";
import { pipInclude } from "@/lib/pips";
import { weekLabel } from "@/lib/weeks";

/**
 * The exportable performance record (brief §8): per person, per date range —
 * the scorecard in force, every check-in with BOTH sets of scores and
 * comments, blockers and their resolution, development objectives, and PIP
 * documentation. This is the artefact handed to a labour consultant or a
 * CCMA process, so it is complete and plain rather than pretty.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const INK = rgb(0.12, 0.14, 0.16);
const MUTED = rgb(0.42, 0.45, 0.49);
const BLUE = rgb(0.24, 0.49, 0.79); // self
const PURPLE = rgb(0.55, 0.24, 0.69); // manager

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont
  ) {
    this.addPage();
  }
  addPage() {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN) this.addPage();
  }
  /** Standard fonts are WinAnsi-only: swap characters they cannot encode. */
  sanitize(text: string): string {
    return text
      .replaceAll("→", "->")
      .replaceAll("✓", "[done]")
      .replaceAll(/[‘’]/g, "'")
      .replaceAll(/[“”]/g, '"')
      .replaceAll("…", "...")
      .replaceAll(/[^\x00-\xFF–—]/g, "?");
  }
  wrap(text: string, size: number, font: PDFFont, width: number): string[] {
    const words = this.sanitize(text).replaceAll("\r", "").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [""];
  }
  text(
    content: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gapAfter?: number;
    } = {}
  ) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.bold : this.font;
    const indent = opts.indent ?? 0;
    const width = A4.width - 2 * MARGIN - indent;
    for (const line of this.wrap(content, size, font, width)) {
      this.ensure(size + 4);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - size,
        size,
        font,
        color: opts.color ?? INK,
      });
      this.y -= size + 3;
    }
    this.y -= opts.gapAfter ?? 2;
  }
  heading(content: string, size = 13) {
    this.ensure(size + 14);
    this.y -= 8;
    this.text(content, { size, bold: true, gapAfter: 4 });
  }
  rule() {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 4 },
      end: { x: A4.width - MARGIN, y: this.y - 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.86, 0.88),
    });
    this.y -= 12;
  }
}

const d = (date: Date | null | undefined) =>
  date ? date.toISOString().slice(0, 10) : "—";

export async function buildPerformanceRecordPdf(opts: {
  userId: string;
  from: Date;
  to: Date;
  generatedByName: string;
}): Promise<Uint8Array> {
  const { userId, from, to } = opts;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { manager: { select: { name: true } } },
  });
  if (!user) throw new Error("User not found");

  const checkIns = await db.checkIn.findMany({
    where: { userId, createdAt: { gte: from, lte: to } },
    orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
    include: checkInInclude,
  });
  const scorecards = await db.scorecard.findMany({
    where: { userId },
    orderBy: { version: "asc" },
    include: {
      perspectives: {
        orderBy: { sortOrder: "asc" },
        include: { measures: { orderBy: { sortOrder: "asc" } } },
      },
      template: { select: { name: true } },
    },
  });
  const blockers = await db.blocker.findMany({
    where: { userId, createdAt: { gte: from, lte: to } },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const objectives = await db.developmentObjective.findMany({
    where: { userId },
    include: { notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const pips = await db.pip.findMany({
    where: { userId },
    include: pipInclude,
    orderBy: { createdAt: "asc" },
  });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);

  // Cover block
  w.text("Heya Performance Record", { size: 18, bold: true, gapAfter: 4 });
  w.text(`${user.name}${user.jobTitle ? ` — ${user.jobTitle}` : ""}`, { size: 12, gapAfter: 2 });
  w.text(`Manager: ${user.manager?.name ?? "—"}`, { color: MUTED });
  w.text(`Period: ${d(from)} to ${d(to)}`, { color: MUTED });
  w.text(
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by ${opts.generatedByName}`,
    { color: MUTED, gapAfter: 6 }
  );
  w.rule();

  // Scorecards in force
  w.heading("Scorecard(s) in force");
  for (const sc of scorecards) {
    w.text(
      `Version ${sc.version} — ${sc.template?.name ?? "Custom"} · effective ${d(sc.effectiveFrom)}${sc.effectiveTo ? ` to ${d(sc.effectiveTo)}` : " (current)"}`,
      { bold: true, gapAfter: 3 }
    );
    for (const p of sc.perspectives) {
      w.text(`${PERSPECTIVE_LABEL[p.kind]} (${p.weightPct}%)`, { bold: true, indent: 10 });
      for (const m of p.measures) {
        w.text(`${m.code} ${m.name} (weight ${m.weight}) — ${m.definition}`, { indent: 20 });
        w.text(`3 = ${m.anchor3}`, { indent: 20, color: MUTED, gapAfter: 4 });
      }
    }
    w.y -= 4;
  }
  w.rule();

  // Check-ins
  w.heading(`Check-ins in period (${checkIns.length})`);
  for (const c of checkIns) {
    const week = weekLabel({ isoYear: c.isoYear, isoWeek: c.isoWeek });
    w.ensure(60);
    w.text(
      `${week} · ${c.type === "WEEKLY" ? "Weekly" : c.type === "PROBATION_REVIEW" ? "Probation review" : "PIP review"} · ${STATUS_LABEL[c.status]}`,
      { size: 11, bold: true, gapAfter: 2 }
    );
    w.text(
      `Self submitted ${d(c.selfSubmittedAt)} · manager submitted ${d(c.managerSubmittedAt)} · discussed ${d(c.discussionHeldAt)} · acknowledged ${d(c.acknowledgedAt)}`,
      { color: MUTED, gapAfter: 4 }
    );

    const selfBy = new Map(c.ratings.filter((r) => r.rater === "SELF").map((r) => [r.measureId, r]));
    const mgrBy = new Map(c.ratings.filter((r) => r.rater === "MANAGER").map((r) => [r.measureId, r]));
    for (const p of c.scorecard.perspectives) {
      for (const m of p.measures) {
        const s = selfBy.get(m.id);
        const g = mgrBy.get(m.id);
        if (!s && !g) continue;
        const fmt = (r?: typeof s) =>
          !r ? "–" : r.notApplicable ? `N/A (${r.naReason ?? ""})` : String(r.rating ?? "–");
        w.text(`${m.code} ${m.name}: self ${fmt(s)} · manager ${fmt(g)}`, { indent: 10 });
        if (s?.comment) w.text(`Self: ${s.comment}`, { indent: 20, color: BLUE });
        if (g?.comment) w.text(`Manager: ${g.comment}`, { indent: 20, color: PURPLE });
      }
    }
    const narrative: [string, string | null][] = [
      ["Win of the week", c.winOfWeek],
      ["Focus for next week", c.focusNextWeek],
      ["What is in the way", c.inTheWay],
      ["Support needed", c.supportNeeded],
      ["Coaching note", c.coachingNote],
      ["Agreed priorities", c.agreedPriorities],
    ];
    for (const [label, value] of narrative) {
      if (value?.trim()) w.text(`${label}: ${value}`, { indent: 10 });
    }
    const amendments = await amendmentsForCheckIn(c.id);
    for (const a of amendments) {
      w.text(
        `AMENDMENT ${d(a.changedAt)} by ${a.changedBy.name}: ${a.field} ${a.oldValue ?? "—"} → ${a.newValue ?? "—"} — ${a.reason}`,
        { indent: 10, color: rgb(0.7, 0.26, 0.09) }
      );
    }
    w.y -= 6;
  }
  w.rule();

  // Blockers
  w.heading(`Blockers raised in period (${blockers.length})`);
  for (const b of blockers) {
    w.text(
      `${d(b.createdAt)} — ${b.description} · owner ${b.owner?.name ?? "unassigned"} · target ${d(b.targetDate)} · ${b.status}${b.resolution ? ` — ${b.resolution}` : ""}`,
      { indent: 10, gapAfter: 3 }
    );
  }
  w.rule();

  // Development objectives
  w.heading(`Development objectives (${objectives.length})`);
  for (const o of objectives) {
    w.text(`${o.title} · ${o.status} · target ${d(o.targetDate)}`, { indent: 10, bold: true });
    if (o.detail) w.text(o.detail, { indent: 20 });
    for (const n of o.notes) {
      w.text(`${d(n.createdAt)} ${n.author.name}: ${n.note}`, { indent: 20, color: MUTED });
    }
    w.y -= 3;
  }

  // PIPs
  if (pips.length > 0) {
    w.rule();
    w.heading(`Performance improvement plans (${pips.length})`);
    for (const p of pips) {
      w.text(
        `Opened ${d(p.startDate)} by ${p.openedBy.name} · status ${p.status}${p.endDate ? ` · review period to ${d(p.endDate)}` : ""}`,
        { indent: 10, bold: true }
      );
      w.text(`Standard required: ${p.standardRequired}`, { indent: 10 });
      for (const m of p.measures) {
        w.text(`Falling short on ${m.measure.code} ${m.measure.name}: ${m.shortfall}`, { indent: 20 });
        w.text(`Standard (3): ${m.measure.anchor3}`, { indent: 20, color: MUTED });
      }
      for (const s of p.supportActions) {
        w.text(`Support ${d(s.providedAt)} (${s.type}): ${s.description}`, { indent: 20 });
      }
      for (const r of p.reviews) {
        w.text(
          `Review ${d(r.reviewDate)}${r.checkIn ? ` (linked to ${weekLabel({ isoYear: r.checkIn.isoYear, isoWeek: r.checkIn.isoWeek })})` : ""}: ${r.outcome}`,
          { indent: 20 }
        );
      }
      if (p.finalOutcome) {
        w.text(`Final outcome: ${p.finalOutcome} — ${p.outcomeReasoning ?? ""}`, { indent: 10, bold: true });
      }
      w.y -= 4;
    }
  }

  return doc.save();
}
