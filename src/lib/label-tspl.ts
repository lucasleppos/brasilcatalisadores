/**
 * Builds raw printer payloads for the 100 x 50 mm thermal label.
 * TSPL is the default language (Coibeu / TSC compatible); ESC/POS is offered
 * as an alternative for models that only answer in that mode.
 */
import type { LabelData } from "@/components/processes/CeramicoLabelPrint";
import { buildLabelUrl } from "@/lib/labels";
import { fmtNum } from "@/lib/utils";

/** CP850/latin-1 style encoding so accents print correctly. */
function encodeLatin(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i] = code < 256 ? code : 63; // "?"
  }
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

/** TSPL strings must not contain unescaped quotes. */
const clean = (v: unknown) => String(v ?? "").replace(/["\\]/g, " ").trim();

/** Ordered data rows shown on the left side of the label. */
export function labelLines(l: LabelData): string[] {
  const lines = [
    `Comprador: ${clean(l.buyer) || "-"}`,
    `Fornecedor: ${clean(l.supplierName)}`,
    l.typeLabel ? `Tipo: ${clean(l.typeLabel)}` : `Grupo: ${clean(l.group)}`,
  ];
  if (l.qtyApproved !== undefined || l.qtyRejected !== undefined) {
    lines.push(`Aprov.: ${l.qtyApproved ?? 0} un  Reprov.: ${l.qtyRejected ?? 0} un`);
  }
  if (l.qtyDeclared !== undefined) lines.push(`Qtd. Recebida: ${l.qtyDeclared} un`);
  if (l.weightGross !== undefined) lines.push(`Peso Bruto: ${fmtNum(l.weightGross, 3)} kg`);
  return lines;
}

const header = (l: LabelData) =>
  `${clean(l.displayCode || l.code)}${l.stageLabel ? ` [${clean(l.stageLabel)}]` : ""}`;

/** "bitmap" uses the internal bitmap fonts with integer multipliers (safest). */
export type TsplFontMode = "bitmap" | "scalable";

export interface TsplOptions {
  /** 0 or 1 — flips the print orientation on the media. */
  direction?: 0 | 1;
  /** Safety margins in dots (203 dpi ≈ 8 dots/mm). */
  marginX?: number;
  marginY?: number;
  /** Vertical gap between labels, in mm. */
  gapMm?: number;
  /** Vertical offset (tear/feed adjustment) in mm. */
  offsetMm?: number;
  density?: number;
  speed?: number;
  /** Copies of the same label per PRINT command. */
  copies?: number;
  /** Font family used for the text: internal bitmap fonts or the scalable font "0". */
  fontMode?: TsplFontMode;
  /** Bitmap multiplier (1-3) or point size (8-24) for the lot code header. */
  titleScale?: number;
  /** Bitmap multiplier (1-3) or point size (8-24) for the data rows. */
  textScale?: number;
}

export const TSPL_DEFAULTS: Required<TsplOptions> = {
  direction: 1,
  marginX: 10,
  marginY: 10,
  gapMm: 3,
  offsetMm: 0,
  density: 10,
  speed: 4,
  copies: 1,
  fontMode: "bitmap",
  titleScale: 1,
  textScale: 1,
};

/**
 * Calibration header sent ONCE per print job. Repeating it for every label makes
 * the printer re-run its gap routine and eject a blank label in between.
 */
export function tsplJobHeader(o: {
  gapMm: number;
  offsetMm: number;
  direction: 0 | 1;
  density: number;
  speed: number;
}): string[] {
  return [
    "SIZE 100 mm,50 mm",
    `GAP ${o.gapMm} mm,0 mm`,
    `OFFSET ${o.offsetMm} mm`,
    "SET TEAR OFF",
    `DIRECTION ${o.direction}`,
    "REFERENCE 0,0",
    `DENSITY ${o.density}`,
    `SPEED ${o.speed}`,
  ];
}

/** One-shot label sensor auto-calibration (learns the real label + gap length). */
export function buildGapDetect(gapMm = TSPL_DEFAULTS.gapMm): Uint8Array {
  return encodeLatin(
    ["SIZE 100 mm,50 mm", `GAP ${gapMm} mm,0 mm`, "GAPDETECT", "END"].join("\r\n") + "\r\n",
  );
}


/** Scalable-font defaults (point size) — the values that printed correctly before. */
export const SCALABLE_DEFAULTS = { titleScale: 13, textScale: 9 };

/** Allowed ranges per font mode. */
export const SCALE_RANGE: Record<TsplFontMode, { min: number; max: number }> = {
  bitmap: { min: 1, max: 3 },
  scalable: { min: 8, max: 24 },
};

/** Label canvas at 203 dpi: 100 x 50 mm = 800 x 400 dots. */
const LABEL_WIDTH_DOTS = 800;
const LABEL_HEIGHT_DOTS = 400;
const QR_MODULE_SIZE = 5;
const QR_SIZE_DOTS = 185;
const QR_COLUMN_DOTS = 205;
const COLUMN_GAP_DOTS = 16;

/** TSPL internal bitmap font metrics at multiplier 1. */
const BITMAP_FONT = {
  title: { id: "2", width: 12, height: 20 },
  row: { id: "1", width: 8, height: 12 },
};

/** Keeps printer-rendered text inside its physical column. */
function fitText(text: string, maxWidth: number, charWidth: number): string {
  const maxChars = Math.max(1, Math.floor(maxWidth / Math.max(1, charWidth)));
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3).trimEnd()}...`;
}

export function clampScale(v: unknown, mode: TsplFontMode, fallback: number): number {
  const { min, max } = SCALE_RANGE[mode];
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Drawing commands for one label (no calibration header): CLS ... PRINT.
 * 100 x 50 mm @ 203 dpi = 800 x 400 dots. Left column: lot code + data rows.
 * Right column: QR code drawn by the printer.
 */
export function tsplLabelBlock(l: LabelData, opts: TsplOptions = {}): string[] {
  const o = { ...TSPL_DEFAULTS, ...opts };
  const mode: TsplFontMode = o.fontMode === "scalable" ? "scalable" : "bitmap";
  const url = buildLabelUrl(l.code);
  const x = Math.max(0, Math.round(o.marginX));
  const y = Math.max(0, Math.round(o.marginY));
  const usableWidth = LABEL_WIDTH_DOTS - x * 2;
  const qrX = x + Math.max(0, usableWidth - QR_COLUMN_DOTS);
  const textX = x + 6;
  const textWidth = Math.max(40, qrX - COLUMN_GAP_DOTS - textX);

  const fallbacks = mode === "bitmap" ? TSPL_DEFAULTS : SCALABLE_DEFAULTS;
  const titleScale = clampScale(o.titleScale, mode, fallbacks.titleScale);
  const textScale = clampScale(o.textScale, mode, fallbacks.textScale);

  const titleFont = mode === "bitmap" ? BITMAP_FONT.title.id : "0";
  const rowFont = mode === "bitmap" ? BITMAP_FONT.row.id : "0";
  const codeScale =
    mode === "bitmap" ? 1 : Math.max(SCALE_RANGE.scalable.min, textScale - 1);

  const titleHeight =
    mode === "bitmap" ? BITMAP_FONT.title.height * titleScale : Math.round(titleScale * 4.5);
  const rowHeight =
    mode === "bitmap" ? BITMAP_FONT.row.height * textScale : Math.round(textScale * 4.5);
  const titleCharWidth =
    mode === "bitmap" ? BITMAP_FONT.title.width * titleScale : Math.max(5, Math.round(titleScale * 0.65));
  const rowCharWidth =
    mode === "bitmap" ? BITMAP_FONT.row.width * textScale : Math.max(5, Math.round(textScale * 0.65));
  const rowStep = rowHeight + 8;
  const titleY = y + 8;
  const separatorY = titleY + titleHeight + 8;
  const qrY = separatorY + 10;
  const qrCodeY = Math.min(LABEL_HEIGHT_DOTS - y - rowHeight, qrY + QR_SIZE_DOTS + 8);
  const fittedHeader = fitText(header(l), textWidth, titleCharWidth);

  const cmds: string[] = [
    "CLS",
    // lot code + separator
    `TEXT ${textX},${titleY},"${titleFont}",0,${titleScale},${titleScale},"${fittedHeader}"`,
    `BAR ${textX},${separatorY},${Math.max(40, usableWidth - 12)},3`,
  ];

  let rowY = separatorY + 14;
  for (const line of labelLines(l)) {
    const fittedLine = fitText(line, textWidth, rowCharWidth);
    cmds.push(`TEXT ${textX},${rowY},"${rowFont}",0,${textScale},${textScale},"${fittedLine}"`);
    rowY += rowStep;
  }

  cmds.push(`QRCODE ${qrX},${qrY},M,${QR_MODULE_SIZE},A,0,"${url}"`);
  const qrCode = fitText(clean(l.code), QR_COLUMN_DOTS, rowCharWidth);
  const qrCodeWidth = qrCode.length * rowCharWidth;
  const qrCodeX = qrX + Math.max(0, Math.floor((QR_SIZE_DOTS - qrCodeWidth) / 2));
  cmds.push(
    `TEXT ${qrCodeX},${qrCodeY},"${rowFont}",0,${codeScale},${codeScale},"${qrCode}"`,
  );
  cmds.push(`PRINT 1,${Math.max(1, Math.round(o.copies))}`);
  return cmds;
}

/** Single job with all labels: one calibration header, one block per label. */
export function buildTsplJob(labels: LabelData[], opts: TsplOptions = {}): Uint8Array {
  const o = { ...TSPL_DEFAULTS, ...opts };
  const cmds = [
    ...tsplJobHeader(o),
    ...labels.flatMap(l => tsplLabelBlock(l, o)),
    "END",
  ];
  return encodeLatin(cmds.join("\r\n") + "\r\n");
}

/** Convenience wrapper for a single label. */
export function buildTspl(l: LabelData, opts: TsplOptions = {}): Uint8Array {
  return buildTsplJob([l], opts);
}




/** ESC/POS fallback: text lines plus a native QR code, then a cut/feed. */
export function buildEscPos(l: LabelData): Uint8Array {
  const url = buildLabelUrl(l.code);
  const esc = (s: string) => encodeLatin(s);
  const parts: Uint8Array[] = [
    new Uint8Array([0x1b, 0x40]), // init
    new Uint8Array([0x1b, 0x74, 0x02]), // codepage PC850
    new Uint8Array([0x1b, 0x21, 0x30]), // double width/height
    esc(`${header(l)}\n`),
    new Uint8Array([0x1b, 0x21, 0x00]),
    esc(labelLines(l).join("\n") + "\n"),
  ];

  // QR code: model 2, module size 6, error correction M
  const data = encodeLatin(url);
  const len = data.length + 3;
  parts.push(
    new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06]),
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),
    new Uint8Array([0x1d, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30]),
    data,
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
    esc("\n\n"),
  );

  return concat(parts);
}

/** Test label used to validate the pairing and the chosen language. */
export const TEST_LABEL: LabelData = {
  code: "240826-TESTE-01",
  displayCode: "240826-TESTE-LONGO",
  stageLabel: "TESTE",
  buyer: "Comprador de teste completo",
  supplierName: "Fornecedor com nome longo para calibracao",
  group: "Ceramico automotivo",
  weightGross: 12.345,
};
