import { rgb, type PDFDocument, type PDFFont, type PDFPage } from "pdf-lib";

/** Shared cursor-based text layout for the app's PDF documents. */

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 50;
export const INK = rgb(0.12, 0.14, 0.16);
export const MUTED = rgb(0.42, 0.45, 0.49);
export const BLUE = rgb(0.24, 0.49, 0.79); // self
export const PURPLE = rgb(0.55, 0.24, 0.69); // manager

export class Writer {
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
