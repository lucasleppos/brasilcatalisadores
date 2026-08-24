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

export interface TsplOptions {
  /** 0 or 1 — flips the print orientation on the media. */
  direction?: 0 | 1;
  /** Safety margins in dots (203 dpi ≈ 8 dots/mm). */
  marginX?: number;
  marginY?: number;
  /** Vertical gap between labels, in mm. */
  gapMm?: number;
  density?: number;
  speed?: number;
  /** Copies of the same label per PRINT command. */
  copies?: number;
}

export const TSPL_DEFAULTS: Required<TsplOptions> = {
  direction: 1,
  marginX: 10,
  marginY: 10,
  gapMm: 3,
  density: 10,
  speed: 4,
  copies: 1,
};

/** Label canvas at 203 dpi: 100 x 50 mm = 800 x 400 dots. */
const LABEL_WIDTH_DOTS = 800;
const QR_BLOCK_DOTS = 215;

/**
 * TSPL payload for one label (100 x 50 mm @ 203 dpi = 800 x 400 dots).
 * Left column: lot code + data rows. Right column: QR code drawn by the printer.
 */
export function buildTspl(l: LabelData, opts: TsplOptions = {}): Uint8Array {
  const o = { ...TSPL_DEFAULTS, ...opts };
  const url = buildLabelUrl(l.code);
  const x = Math.max(0, Math.round(o.marginX));
  const y = Math.max(0, Math.round(o.marginY));
  const usableWidth = LABEL_WIDTH_DOTS - x * 2;
  const qrX = x + Math.max(0, usableWidth - QR_BLOCK_DOTS);

  const cmds: string[] = [
    "SIZE 100 mm,50 mm",
    `GAP ${o.gapMm} mm,0 mm`,
    `DIRECTION ${o.direction}`,
    "REFERENCE 0,0",
    `DENSITY ${o.density}`,
    `SPEED ${o.speed}`,
    "CLS",
    // lot code + separator
    `TEXT ${x + 6},${y + 8},"0",0,13,13,"${header(l)}"`,
    `BAR ${x + 6},${y + 64},${Math.max(40, usableWidth - 12)},3`,
  ];

  let rowY = y + 86;
  for (const line of labelLines(l)) {
    cmds.push(`TEXT ${x + 6},${rowY},"0",0,9,9,"${line}"`);
    rowY += 40;
  }

  cmds.push(`QRCODE ${qrX},${y + 80},M,6,A,0,"${url}"`);
  cmds.push(`TEXT ${qrX},${y + 290},"0",0,7,7,"${clean(l.code)}"`);
  cmds.push(`PRINT 1,${Math.max(1, Math.round(o.copies))}`);
  cmds.push("END");

  return encodeLatin(cmds.join("\r\n") + "\r\n");
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
  code: "LOT-TESTE-00-01",
  displayCode: "LOT-TESTE-00",
  stageLabel: "TESTE",
  buyer: "Teste de impressao",
  supplierName: "Brasil Catalisadores",
  group: "Teste",
  weightGross: 12.345,
};
