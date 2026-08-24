/**
 * Renders the 100 x 50 mm label as a 1-bit raster image and wraps it in a TSPL
 * BITMAP command. This gives us full control over the font size (in pixels),
 * instead of depending on the printer's internal fonts.
 *
 * Canvas: 800 x 400 dots (100 x 50 mm @ 203 dpi).
 */
import QRCode from "qrcode";
import type { LabelData } from "@/components/processes/CeramicoLabelPrint";
import { buildLabelUrl } from "@/lib/labels";
import { labelLines } from "@/lib/label-tspl";

export const LABEL_W = 800;
export const LABEL_H = 400;

export interface RasterOptions {
  direction?: 0 | 1;
  marginX?: number;
  marginY?: number;
  gapMm?: number;
  offsetMm?: number;
  density?: number;
  speed?: number;
  copies?: number;
  /** Font size in px (dots) for the lot code header. */
  titlePx?: number;
  /** Font size in px (dots) for the data rows. */
  textPx?: number;
}

export const RASTER_DEFAULTS: Required<RasterOptions> = {
  direction: 1,
  marginX: 10,
  marginY: 10,
  gapMm: 3,
  offsetMm: 0,
  density: 10,
  speed: 4,
  copies: 1,
  titlePx: 30,
  textPx: 22,
};

export const RASTER_PX_RANGE = { min: 12, max: 56 };


const clean = (v: unknown) => String(v ?? "").trim();

const header = (l: LabelData) =>
  `${clean(l.displayCode || l.code)}${l.stageLabel ? ` [${clean(l.stageLabel)}]` : ""}`;

function clampPx(v: unknown, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(RASTER_PX_RANGE.max, Math.max(RASTER_PX_RANGE.min, n));
}

/** Draws text, shrinking down to 70% and finally truncating so it never overflows. */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  px: number,
  weight: "normal" | "bold",
) {
  let size = px;
  const font = (s: number) => `${weight} ${s}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  ctx.font = font(size);
  const min = Math.max(RASTER_PX_RANGE.min, Math.round(px * 0.7));
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 1;
    ctx.font = font(size);
  }
  let out = text;
  while (out.length > 4 && ctx.measureText(`${out}...`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  if (out !== text) out = `${out.trimEnd()}...`;
  ctx.fillText(out, x, y);
}

/** Renders the label onto a canvas and returns it (used for print + preview). */
export async function renderLabelCanvas(
  l: LabelData,
  opts: RasterOptions = {},
): Promise<HTMLCanvasElement> {
  const o = { ...RASTER_DEFAULTS, ...opts };
  const titlePx = clampPx(o.titlePx, RASTER_DEFAULTS.titlePx);
  const textPx = clampPx(o.textPx, RASTER_DEFAULTS.textPx);

  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste dispositivo.");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";

  const x = Math.max(0, Math.round(o.marginX));
  const y = Math.max(0, Math.round(o.marginY));
  const usableW = LABEL_W - x * 2;

  // QR column on the right
  const qrSize = 190;
  const qrX = x + usableW - qrSize;
  const textW = Math.max(80, qrX - 20 - x);

  // header + separator
  drawFitted(ctx, header(l), x, y, textW + 20, titlePx, "bold");
  const sepY = y + titlePx + 8;
  ctx.fillRect(x, sepY, usableW, 3);

  // data rows
  const step = Math.round(textPx * 1.45);
  let rowY = sepY + 12;
  for (const line of labelLines(l)) {
    if (rowY + textPx > LABEL_H - y) break;
    drawFitted(ctx, line, x, rowY, textW, textPx, "normal");
    rowY += step;
  }

  // QR code drawn module by module for crisp edges
  const qr = QRCode.create(buildLabelUrl(l.code), { errorCorrectionLevel: "M" });
  const modules = qr.modules;
  const count = modules.size;
  const scale = Math.max(2, Math.floor(qrSize / count));
  const drawn = count * scale;
  const qrY = sepY + 12;
  const offX = qrX + Math.floor((qrSize - drawn) / 2);
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules.get(r, c)) {
        ctx.fillRect(offX + c * scale, qrY + r * scale, scale, scale);
      }
    }
  }

  // code under the QR
  const codePx = Math.max(RASTER_PX_RANGE.min, Math.round(textPx * 0.85));
  const codeY = Math.min(LABEL_H - y - codePx, qrY + drawn + 6);
  ctx.textAlign = "center";
  drawFitted(ctx, clean(l.code), offX + drawn / 2, codeY, qrSize, codePx, "normal");
  ctx.textAlign = "left";

  return canvas;
}

/** Packs the canvas into TSPL BITMAP data (1 = white, 0 = black), MSB first. */
function packBitmap(canvas: HTMLCanvasElement): { widthBytes: number; data: Uint8Array } {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = Math.ceil(width / 8);
  const data = new Uint8Array(widthBytes * height).fill(0xff);
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const i = (yy * width + xx) * 4;
      const lum = (img[i] * 299 + img[i + 1] * 587 + img[i + 2] * 114) / 1000;
      if (lum < 128) {
        const idx = yy * widthBytes + (xx >> 3);
        data[idx] &= ~(0x80 >> (xx & 7));
      }
    }
  }
  return { widthBytes, data };
}

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Drawing bytes for one label: CLS + BITMAP + PRINT (no calibration header). */
async function rasterBlock(l: LabelData, o: Required<RasterOptions>): Promise<Uint8Array> {
  const canvas = await renderLabelCanvas(l, o);
  const { widthBytes, data } = packBitmap(canvas);
  const head = ascii(["CLS", `BITMAP 0,0,${widthBytes},${canvas.height},0,`].join("\r\n"));
  const tail = ascii(`\r\nPRINT 1,${Math.max(1, Math.round(o.copies))}\r\n`);
  const out = new Uint8Array(head.length + data.length + tail.length);
  out.set(head, 0);
  out.set(data, head.length);
  out.set(tail, head.length + data.length);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * Single TSPL job with every label: ONE calibration header, then one
 * CLS/BITMAP/PRINT block per label, then END. Repeating the header per label
 * makes the printer re-run gap detection and eject blank labels in between.
 */
export async function buildTsplRasterJob(
  labels: LabelData[],
  opts: RasterOptions = {},
): Promise<Uint8Array> {
  const o = { ...RASTER_DEFAULTS, ...opts };
  const head = ascii(tsplJobHeader(o).join("\r\n") + "\r\n");
  const blocks: Uint8Array[] = [];
  for (const l of labels) blocks.push(await rasterBlock(l, o));
  return concat([head, ...blocks, ascii("END\r\n")]);
}

/** Convenience wrapper for a single label. */
export async function buildTsplRaster(l: LabelData, opts: RasterOptions = {}): Promise<Uint8Array> {
  return buildTsplRasterJob([l], opts);
}

