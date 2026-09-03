/**
 * Relatório A4 imprimível (Salvar como PDF) das peças separadas do fluxo
 * de "Peça em Sacola", para envio ao fornecedor decidir o destino.
 *
 * Usa a mesma técnica de impressão isolada por iframe das etiquetas térmicas,
 * evitando que o layout do app vaze para a impressão.
 */

export interface SeparatedPieceRow {
  seq?: number;
  code: string;
  reference?: string | null;
}

export interface SeparatedPiecesReportData {
  purchaseNumber: string;
  date?: string | Date | null;
  supplierName: string;
  branch?: string;
  buyer?: string;
  erpNumber?: string;
  pieces: SeparatedPieceRow[];
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
};

const STYLES = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11pt; }
  h1 { font-size: 14pt; margin: 0 0 2mm; }
  .sub { font-size: 9.5pt; color: #333; margin: 0 0 5mm; }
  .info { width: 100%; border-collapse: collapse; margin-bottom: 6mm; font-size: 10pt; }
  .info td { padding: 1.2mm 0; vertical-align: top; }
  .info .k { width: 28mm; color: #444; }
  table.list { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.list th, table.list td { border: 1px solid #000; padding: 1.8mm 2mm; text-align: left; }
  table.list th { background: #eee; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .3px; }
  table.list td.num { width: 16mm; text-align: center; }
  .mono { font-family: "Courier New", monospace; }
  .total { margin-top: 4mm; font-size: 10.5pt; font-weight: bold; }
  .note { margin-top: 4mm; font-size: 9pt; color: #333; line-height: 1.45; }
  .sign { margin-top: 16mm; font-size: 9.5pt; }
  .sign .line { border-top: 1px solid #000; width: 80mm; padding-top: 1.5mm; }
`;

function reportHtml(d: SeparatedPiecesReportData): string {
  const rows = d.pieces
    .map(
      (p, i) => `<tr>
        <td class="num">${esc(p.seq ?? i + 1)}</td>
        <td class="mono">${esc(p.code || "—")}</td>
        <td class="mono">${esc(p.reference || "—")}</td>
      </tr>`,
    )
    .join("");

  const info = [
    ["OP", esc(d.purchaseNumber)],
    ["Data", esc(fmtDate(d.date))],
    ["Fornecedor", esc(d.supplierName)],
    d.branch ? ["Filial", esc(d.branch)] : null,
    d.buyer ? ["Comprador", esc(d.buyer)] : null,
    d.erpNumber ? ["Boleto Syge", esc(d.erpNumber)] : null,
  ]
    .filter(Boolean)
    .map(pair => `<tr><td class="k">${(pair as string[])[0]}</td><td><strong>${(pair as string[])[1]}</strong></td></tr>`)
    .join("");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" />
    <title>Peças separadas do fluxo — ${esc(d.purchaseNumber)}</title>
    <style>${STYLES}</style></head><body>
    <h1>Peças separadas do fluxo — para avaliação do fornecedor</h1>
    <p class="sub">Relação das peças que não seguem o fluxo de sacola nesta ordem de produção.</p>
    <table class="info">${info}</table>
    <table class="list">
      <thead><tr><th>Nº</th><th>Código</th><th>Referência</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3">Nenhuma peça separada.</td></tr>`}</tbody>
    </table>
    <p class="total">Total de peças separadas: ${d.pieces.length}</p>
    <p class="note">
      As peças acima estão registradas nesta compra apenas para histórico e rastreabilidade, aguardando decisão
      do fornecedor (retorno das peças ou compra como material cerâmico). Não integram a valorização desta OP.
    </p>
    <div class="sign">
      <div class="line">Ciência do fornecedor / data</div>
    </div>
  </body></html>`;
}

export async function printSeparatedPiecesReport(data: SeparatedPiecesReportData): Promise<void> {
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
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(reportHtml(data));
  doc.close();

  await new Promise<void>(resolve => setTimeout(resolve, 120));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 1000);
}

export default printSeparatedPiecesReport;
