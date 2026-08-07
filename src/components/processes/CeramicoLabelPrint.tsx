import { buildLabelUrl, generateQRCodeDataUrl } from "@/lib/labels";
import { fmtNum } from "@/lib/utils";

export interface LabelData {
  /** Unique internal code (used as QR target + React key) */
  code: string;
  /** Code displayed on the label header (without seq suffix) */
  displayCode?: string;
  buyer: string;
  supplierName: string;
  group: string;
  /** Weight shown as "Peso Bruto" because tara is not informed at this stage */
  weightGross?: number;
  /** Optional material type label (ex: "Peças", "Peças em Sacola") */
  typeLabel?: string;
  /** Optional approved/rejected quantities (pieces flows) */
  qtyApproved?: number;
  qtyRejected?: number;
  /** Optional stage marker printed next to the lot code (ex: "ENTRADA") */
  stageLabel?: string;
  /** Optional declared quantity (units) — used on the entry label */
  qtyDeclared?: number;
}


const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STYLES = `
  @page { size: 100mm 50mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .label {
    width: 100mm;
    height: 49.8mm;
    box-sizing: border-box;
    padding: 2mm 2.5mm;
    color: #000;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 27mm;
    gap: 2mm;
    align-items: stretch;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  .info { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; overflow: hidden; }
  .lote {
    font-size: 12pt; font-weight: 900; line-height: 1.05;
    border-bottom: 0.4mm solid #000; padding-bottom: 0.8mm; margin-bottom: 0.8mm;
    white-space: nowrap; overflow: hidden;
  }
  .row { font-size: 10pt; font-weight: 700; line-height: 1.25; margin: 0.2mm 0; overflow: hidden; }
  .row .val { font-weight: 800; }
  .weights { font-size: 13pt; font-weight: 900; margin-top: 0.8mm; white-space: nowrap; }
  .qr { display: flex; align-items: center; justify-content: center; }
  .qr img { width: 27mm; height: 27mm; }
`;

function labelHtml(l: LabelData, qr: string): string {
  const mid = l.typeLabel
    ? `<div class="row"><span>Tipo: </span><span class="val">${esc(l.typeLabel)}</span></div>`
    : `<div class="row"><span>Grupo: </span><span class="val">${esc(l.group)}</span></div>`;
  const qty =
    l.qtyApproved !== undefined || l.qtyRejected !== undefined
      ? `<div class="row"><span>Aprovadas: </span><span class="val">${l.qtyApproved ?? 0} un</span><span> · Reprovadas: </span><span class="val">${l.qtyRejected ?? 0} un</span></div>`
      : "";
  const weight =
    l.weightGross !== undefined
      ? `<div class="weights">Peso Bruto: ${esc(fmtNum(l.weightGross, 3))} kg</div>`
      : "";
  return `
    <div class="label">
      <div class="info">
        <div class="lote">${esc(l.displayCode || l.code)}</div>
        <div class="row"><span>Comprador: </span><span class="val">${esc(l.buyer || "—")}</span></div>
        <div class="row"><span>Fornecedor: </span><span class="val">${esc(l.supplierName)}</span></div>
        ${mid}
        ${qty}
        ${weight}
      </div>
      <div class="qr">${qr ? `<img src="${qr}" alt="${esc(l.code)}" />` : ""}</div>
    </div>`;
}

/**
 * Prints thermal labels (100 x 50 mm, 1 per page) in an isolated hidden iframe,
 * so nothing from the app layout leaks into the print output (no blank pages).
 */
export async function printLabelSheet(labels: LabelData[]): Promise<void> {
  if (labels.length === 0) return;

  const qrCache = new Map<string, string>();
  await Promise.all(
    Array.from(new Set(labels.map(l => l.code))).map(async code => {
      qrCache.set(code, await generateQRCodeDataUrl(buildLabelUrl(code), 260));
    }),
  );

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Etiquetas</title><style>${STYLES}</style></head><body>${labels
    .map(l => labelHtml(l, qrCache.get(l.code) || ""))
    .join("")}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow!;
  // wait for images (QR codes) to decode before printing
  await new Promise<void>(resolve => {
    const imgs = Array.from(doc.images);
    if (imgs.length === 0) return resolve();
    let left = imgs.length;
    const done = () => { if (--left <= 0) resolve(); };
    imgs.forEach(img => {
      if (img.complete) done();
      else { img.addEventListener("load", done); img.addEventListener("error", done); }
    });
    setTimeout(resolve, 3000);
  });

  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 1000);
}

export default printLabelSheet;
