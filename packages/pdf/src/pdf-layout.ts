// Sizing helpers for the PDF templates. react-pdf does not grow a column to
// fit its content the way an HTML table does, and text wider than its box
// paints over its neighbour, so widths are worked out from the data up front.
import { Font } from "@react-pdf/renderer";

// The default hyphenation breaks emails and account numbers with a "-" that
// is not part of them. Words now break at spaces only; anything too long for
// its box goes through fitText.
Font.registerHyphenationCallback((word) => [word]);

// Every Courier glyph is exactly this wide, as a share of font size. Pass it
// as `charWidth` for Mono; Helvetica is measured glyph by glyph.
export const COURIER_CHAR = 0.6;

function helveticaGlyph(ch: string): number {
  if ("MW@".includes(ch)) return 0.95;
  if ("mw".includes(ch)) return 0.78;
  if ("il.,:;' |".includes(ch)) return 0.28;
  if (ch >= "A" && ch <= "Z") return 0.72;
  if (ch >= "0" && ch <= "9") return 0.556;
  if (ch === "-") return 0.333;
  return 0.54;
}

// A slightly generous estimate of how wide `text` prints.
function measure(text: string, fontSize: number, charWidth?: number): number {
  if (charWidth) return text.length * fontSize * charWidth;
  let width = 0;
  for (const ch of text) width += helveticaGlyph(ch);
  return width * fontSize;
}

// Hard-breaks any single token that cannot fit `width` (long invoice numbers,
// IBANs, URLs). Normal words still wrap at spaces.
export function fitText(text: string, width: number, fontSize: number, charWidth?: number): string {
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (measure(token, fontSize, charWidth) <= width) return token;
      const lines: string[] = [];
      let line = "";
      for (const ch of token) {
        if (line && measure(line + ch, fontSize, charWidth) > width) {
          lines.push(line);
          line = "";
        }
        line += ch;
      }
      lines.push(line);
      return lines.join("\n");
    })
    .join("");
}

// False for text so long it would not fit on one page at this width. Table
// rows normally stay whole across a page break; such a row has to split.
export function fitsOnOnePage(
  text: string,
  width: number,
  fontSize: number,
  charWidth?: number,
): boolean {
  const lines = text
    .split("\n")
    .reduce((n, part) => n + Math.max(1, Math.ceil(measure(part, fontSize, charWidth) / width)), 0);
  return lines * fontSize * 1.4 < 560;
}

export type FitColumn = { key: string; header: string; cells: string[] };

export type FitColumnsOptions = {
  columns: FitColumn[];
  /** Full table width, description column included. */
  available: number;
  fontSize: number;
  /** Horizontal padding of one cell, both sides together. */
  padding: number;
  charWidth?: number;
  minFontSize?: number;
  /** Header text is usually larger or letter-spaced: its width per character. */
  headerCharWidth?: number;
  /** Fixed space taken by other columns (e.g. a row number). */
  reserved?: number;
};

// Sizes the numeric columns to their longest value and hands everything left
// to the description. When big numbers would squeeze the description below a
// third of the table, the row font steps down before anything collides.
export function fitColumns({
  columns,
  available,
  fontSize,
  padding,
  charWidth,
  minFontSize = 6,
  headerCharWidth = 5.5,
  reserved = 0,
}: FitColumnsOptions) {
  const minDescription = available / 3;
  const room = available - reserved;

  const widthsAt = (size: number) =>
    columns.map((c) =>
      Math.ceil(
        Math.max(
          c.header.length * headerCharWidth,
          ...c.cells.map((cell) => measure(cell, size, charWidth)),
        ) + padding,
      ),
    );
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  let size = fontSize;
  let widths = widthsAt(size);
  while (size > minFontSize && sum(widths) > room - minDescription) {
    size = Math.max(minFontSize, size - 0.5);
    widths = widthsAt(size);
  }

  // Still too wide at the smallest size: squeeze, and let fitText break the
  // values rather than paint them over each other.
  const overflow = sum(widths) - (room - minDescription);
  if (overflow > 0) {
    const scale = (room - minDescription) / sum(widths);
    widths = widths.map((w) => Math.floor(w * scale));
  }

  return {
    fontSize: size,
    widths: Object.fromEntries(columns.map((c, i) => [c.key, widths[i]])) as Record<string, number>,
    descriptionWidth: room - sum(widths),
  };
}

// Splits `available` across side-by-side blocks (date strips, meta rows): an
// even grid until a value needs more. Short values always get what they need,
// and whatever is too long to fit shares the rest and breaks with fitText.
export function shareWidths(
  values: string[],
  available: number,
  fontSize: number,
  gap: number,
  charWidth?: number,
): number[] {
  const needs = values.map((v) => Math.ceil(measure(v, fontSize, charWidth)) + gap);
  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

  if (sum(needs) >= available) {
    // Lower a shared cap until the capped widths fit; only long values feel it.
    let cap = Math.max(...needs);
    while (sum(needs.map((n) => Math.min(n, cap))) > available && cap > 1) cap -= 1;
    return needs.map((n) => Math.min(n, cap));
  }

  const even = available / values.length;
  const widths = needs.map((n) => Math.max(even, n));
  const excess = sum(widths) - available;
  if (excess <= 0) return widths;
  const slack = widths.map((w, i) => w - needs[i]);
  const totalSlack = sum(slack);
  return widths.map((w, i) => w - (slack[i] / totalSlack) * excess);
}

// Width a label-and-value totals block needs. Grows left past `base` for big
// numbers and never past the page.
export function totalsWidth(
  values: string[],
  labelWidth: number,
  fontSize: number,
  base: number,
  available: number,
  charWidth?: number,
): number {
  const longest = Math.max(...values.map((v) => measure(v, fontSize, charWidth)));
  return Math.min(available, Math.max(base, Math.ceil(labelWidth + longest + 8)));
}
