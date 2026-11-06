import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { createHash } from "node:crypto";

/**
 * Pilot document renderer (quotes, agreement, receipts, comparison, statements). Every page
 * carries a diagonal PILOT watermark and a footer saying the document is a pilot practice
 * document (FR-M38-01). There is no way to render a document without them.
 */
export type DocBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string; muted?: boolean }
  | { type: "kv"; rows: [string, string][] }
  | { type: "table"; columns: string[]; rows: string[][]; widths?: number[]; alignRight?: number[] }
  | { type: "money"; rows: { label: string; value: string; strong?: boolean }[] }
  | { type: "spacer"; size?: number };

export type DocSpec = { title: string; number?: string; subtitle?: string; footerNote: string; blocks: DocBlock[] };

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const BRAND = rgb(0.059, 0.361, 0.302);
const INK = rgb(0.114, 0.106, 0.086);
const MUTED = rgb(0.42, 0.4, 0.353);
const LINE = rgb(0.886, 0.863, 0.812);

/** Standard PDF fonts use WinAnsi; map the few characters it lacks. */
export function winAnsi(s: string): string {
  return s
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/²/g, "2")
    .replace(/[→]/g, "->")
    .replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ–—‘’“”•…€]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of winAnsi(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function renderPdf(spec: DocSpec): Promise<{ bytes: Buffer; sha256: string }> {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(`${spec.title} (PILOT)`));
  doc.setProducer("Spot-In pilot");
  doc.setSubject(winAnsi(spec.footerNote));
  doc.setKeywords(["PILOT", "Spot-In", "not binding"]);
  doc.setCreator("Spot-In");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const width = A4[0] - MARGIN * 2;

  const newPage = () => {
    page = doc.addPage(A4);
    pages.push(page);
    y = A4[1] - MARGIN;
    if (pages.length === 1) {
      page.drawText(winAnsi(spec.title), { x: MARGIN, y: y - 18, size: 18, font: bold, color: INK });
      y -= 26;
      if (spec.number) {
        page.drawText(winAnsi(spec.number), { x: MARGIN, y: y - 10, size: 9, font, color: MUTED });
        y -= 14;
      }
      if (spec.subtitle) {
        for (const l of wrap(spec.subtitle, font, 10, width)) {
          page.drawText(l, { x: MARGIN, y: y - 12, size: 10, font, color: MUTED });
          y -= 14;
        }
      }
      page.drawLine({ start: { x: MARGIN, y: y - 6 }, end: { x: A4[0] - MARGIN, y: y - 6 }, thickness: 0.8, color: LINE });
      y -= 18;
    }
  };
  const ensure = (h: number) => {
    if (y - h < MARGIN + 40) newPage();
  };
  newPage();

  for (const b of spec.blocks) {
    if (b.type === "spacer") {
      y -= b.size ?? 8;
    } else if (b.type === "heading") {
      ensure(30);
      y -= 8;
      page.drawText(winAnsi(b.text), { x: MARGIN, y: y - 12, size: 12, font: bold, color: BRAND });
      y -= 20;
    } else if (b.type === "text") {
      for (const l of wrap(b.text, font, 10, width)) {
        ensure(14);
        page.drawText(l, { x: MARGIN, y: y - 11, size: 10, font, color: b.muted ? MUTED : INK });
        y -= 14;
      }
    } else if (b.type === "kv") {
      for (const [k, v] of b.rows) {
        const lines = wrap(v, font, 10, width - 170);
        ensure(14 * lines.length);
        page.drawText(winAnsi(k), { x: MARGIN, y: y - 11, size: 10, font, color: MUTED });
        lines.forEach((l, i) => page.drawText(l, { x: MARGIN + 170, y: y - 11 - i * 14, size: 10, font, color: INK }));
        y -= 14 * lines.length + 2;
      }
    } else if (b.type === "money") {
      for (const r of b.rows) {
        ensure(16);
        const f = r.strong ? bold : font;
        page.drawText(winAnsi(r.label), { x: MARGIN, y: y - 11, size: 10, font: f, color: INK });
        const v = winAnsi(r.value);
        page.drawText(v, { x: A4[0] - MARGIN - f.widthOfTextAtSize(v, 10), y: y - 11, size: 10, font: f, color: INK });
        y -= 16;
        if (r.strong) page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: A4[0] - MARGIN, y: y + 2 }, thickness: 0.5, color: LINE });
      }
    } else if (b.type === "table") {
      const widths = b.widths ?? b.columns.map(() => width / b.columns.length);
      const drawRow = (cells: string[], f: PDFFont, color = INK) => {
        const wrapped = cells.map((c, i) => wrap(c, f, 9, widths[i]! - 6));
        const h = Math.max(...wrapped.map((w) => w.length)) * 12 + 4;
        ensure(h);
        let x = MARGIN;
        wrapped.forEach((ls, i) => {
          ls.forEach((l, j) => {
            const right = b.alignRight?.includes(i);
            const tx = right ? x + widths[i]! - 4 - f.widthOfTextAtSize(l, 9) : x;
            page.drawText(l, { x: tx, y: y - 10 - j * 12, size: 9, font: f, color });
          });
          x += widths[i]!;
        });
        y -= h;
        page.drawLine({ start: { x: MARGIN, y: y + 1 }, end: { x: A4[0] - MARGIN, y: y + 1 }, thickness: 0.4, color: LINE });
      };
      drawRow(b.columns, bold, MUTED);
      for (const r of b.rows) drawRow(r, font);
    }
  }

  // Watermark and footer on every page (FR-M38-01).
  pages.forEach((p, i) => {
    p.drawText("PILOT", { x: 120, y: 300, size: 140, font: bold, color: BRAND, opacity: 0.08, rotate: degrees(35) });
    p.drawRectangle({ x: A4[0] - MARGIN - 44, y: A4[1] - MARGIN - 16, width: 44, height: 16, borderColor: rgb(0.54, 0.29, 0.06), borderWidth: 1 });
    p.drawText("PILOT", { x: A4[0] - MARGIN - 37, y: A4[1] - MARGIN - 11.5, size: 9, font: bold, color: rgb(0.54, 0.29, 0.06) });
    const foot = winAnsi(`${spec.footerNote}  ·  ${i + 1}/${pages.length}`);
    for (const [j, l] of wrap(foot, font, 8, A4[0] - MARGIN * 2).entries()) {
      p.drawText(l, { x: MARGIN, y: 28 - j * 10, size: 8, font, color: MUTED });
    }
  });

  const bytes = Buffer.from(await doc.save({ useObjectStreams: false }));
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}
