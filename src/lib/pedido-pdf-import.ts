import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore — worker entry resolvido pelo Vite
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = PdfWorker;

export interface ParsedPedidoItem {
  code: string;
  reference: string;
  vehicleModel: string;
  quantity: number;
  unitValueBrl: number;
  /** ATENÇÃO: o PDF rotula "g", mas o número é em KG (bug conhecido do app do fornecedor) */
  unitWeightKg: number;
}

export interface ParsedPedido {
  pedidoNumber: string;
  supplierName: string;
  /** CPF/CNPJ, apenas dígitos */
  supplierDocument: string;
  orderDate: string;
  items: ParsedPedidoItem[];
  /** Somatório calculado dos itens */
  totalWeightKg: number;
  totalValueBrl: number;
  /** Totais informados no rodapé do PDF (para comparação) */
  footerWeightKg: number | null;
  footerValueBrl: number | null;
}

/** "1.014,90" -> 1014.9 ; "0,920" -> 0.92 */
function brNum(raw: string): number {
  const clean = (raw || "")
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Extrai o texto do PDF, uma string por linha visual */
async function extractLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows: { y: number; parts: { x: number; str: string }[] }[] = [];

    for (const item of content.items as any[]) {
      const str = (item.str || "").trim();
      if (!str) continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5]);
      const row = rows.find((r) => Math.abs(r.y - y) <= 3);
      if (row) row.parts.push({ x, str });
      else rows.push({ y, parts: [{ x, str }] });
    }

    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.parts.sort((a, b) => a.x - b.x);
      lines.push(r.parts.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim());
    }
  }

  return lines;
}

interface RawItemLine {
  text: string;
  /** Valor unitário quando a célula "R$ 1.234,56" veio quebrada em outra linha */
  forcedValue?: number;
}

const isBareRs = (l: string) => /^R\$$/.test(l.trim());
const isBareNumber = (l: string) => /^[\d.,]+$/.test(l.trim()) && /\d/.test(l);

/**
 * Normaliza linhas para leitura de itens.
 * O PDF quebra a célula de valor em duas linhas quando passa de mil:
 *   "R$" / "CC* SERIE CC HONDA - HONDA 2 0,890g" / "1.014,90"
 * (ou "R$" / "1.014,90" / linha do item, dependendo da ordem das rows).
 */
function normalizeLines(lines: string[]): RawItemLine[] {
  const out: RawItemLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) continue;

    if (isBareRs(line)) {
      const a = (lines[i + 1] || "").trim();
      const b = (lines[i + 2] || "").trim();
      if (a && !isBareNumber(a) && isBareNumber(b)) {
        out.push({ text: a, forcedValue: brNum(b) });
        i += 2;
        continue;
      }
      if (isBareNumber(a) && b && !isBareNumber(b)) {
        out.push({ text: b, forcedValue: brNum(a) });
        i += 2;
        continue;
      }
      continue; // "R$" solto sem par identificável
    }

    // "algo R$" no fim da linha: o número está na linha seguinte
    if (/R\$\s*$/.test(line)) {
      const next = (lines[i + 1] || "").trim();
      out.push({ text: `${line}${next}`.replace(/\s+/g, " ").trim() });
      i += 1;
      continue;
    }

    out.push({ text: line });
  }
  return out;
}

const ITEM_RE =
  /^(.+?)\s+(\d+)\s+R\$\s*([\d.,]+)\s+([\d.,]+)\s*(?:g|kg|Kg|KG)?\s*(?:\[?(?:no|yes|sim|não|nao)\]?)?$/i;

/** Linha de item sem o valor (célula quebrada): "Código Ref Modelo Qtd Peso" */
const ITEM_NO_VALUE_RE =
  /^(.+?)\s+(\d+)\s+([\d.,]+)\s*(?:g|kg|Kg|KG)\s*(?:\[?(?:no|yes|sim|não|nao)\]?)?$/i;

/** Fatia "Código Referência Modelo" heuristicamente */
function splitHead(head: string): { code: string; reference: string; vehicleModel: string } {
  const tokens = head.split(/\s+/);
  const code = tokens.shift() || "";
  const rest = tokens.join(" ");

  const dashIdx = rest.indexOf(" - ");
  let reference = rest;
  let vehicleModel = "";
  if (dashIdx > -1) {
    const before = rest.slice(0, dashIdx).trim();
    const beforeTokens = before.split(/\s+/);
    const brand = beforeTokens.pop() || "";
    reference = beforeTokens.join(" ").trim() || brand;
    vehicleModel = `${brand}${rest.slice(dashIdx)}`.trim();
  }
  return { code, reference, vehicleModel };
}

/**
 * Tenta interpretar uma linha de item.
 * Formato: Código Referência Modelo Qtd. R$ Valor Peso [Entregue]
 * Valor e peso são SEMPRE unitários — a multiplicação pela quantidade é feita depois.
 */
function parseItemLine(raw: RawItemLine): ParsedPedidoItem | null {
  const line = raw.text;

  const m = line.match(ITEM_RE);
  if (m) {
    const head = m[1].trim();
    const quantity = parseInt(m[2], 10) || 0;
    if (!head || quantity <= 0) return null;
    return {
      ...splitHead(head),
      quantity,
      unitValueBrl: brNum(m[3]),
      unitWeightKg: brNum(m[4]),
    };
  }

  if (raw.forcedValue != null) {
    const n = line.match(ITEM_NO_VALUE_RE);
    if (n) {
      const head = n[1].trim();
      const quantity = parseInt(n[2], 10) || 0;
      if (!head || quantity <= 0) return null;
      return {
        ...splitHead(head),
        quantity,
        unitValueBrl: raw.forcedValue,
        unitWeightKg: brNum(n[3]),
      };
    }
  }

  return null;
}


/** Extrai um ou mais pedidos do PDF gerado pelo app externo de catalisadores */
export async function parsePedidoPdf(file: File): Promise<ParsedPedido[]> {
  const raw = await extractLines(file);
  const lines = joinBrokenLines(raw);

  // Divide o arquivo em blocos por "Pedido Nº"
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (/Pedido\s*N[ºo°]/i.test(l)) starts.push(i);
  });
  if (starts.length === 0) return [];

  const pedidos: ParsedPedido[] = [];

  for (let s = 0; s < starts.length; s++) {
    const block = lines.slice(starts[s], starts[s + 1] ?? lines.length);
    const joined = block.join("\n");

    const numMatch = joined.match(/Pedido\s*N[ºo°]\s*:?\s*(\S+)/i);
    const pedidoNumber = numMatch ? numMatch[1] : "";

    const docMatch = joined.match(/(?:CPF|CNPJ)\s*:?\s*([\d.\-/\s]{11,20})/i);
    const supplierDocument = docMatch ? onlyDigits(docMatch[1]) : "";

    let supplierName = "";
    const cliIdx = block.findIndex((l) => /^Cliente\b/i.test(l));
    if (cliIdx > -1) {
      const inline = block[cliIdx].replace(/^Cliente\s*:?\s*/i, "").trim();
      supplierName = inline || (block[cliIdx + 1] || "").trim();
    }
    supplierName = supplierName.replace(/\s*CPF.*$/i, "").trim();

    const dateMatch = joined.match(/Data do Pedido\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
    const orderDate = dateMatch ? dateMatch[1] : "";

    const items: ParsedPedidoItem[] = [];
    for (const line of block) {
      if (/^C[óo]digo\b/i.test(line)) continue;
      if (/Total|Resumo|Quantidade Total|Peso Total|Valor Total/i.test(line)) continue;
      const item = parseItemLine(line);
      if (item) items.push(item);
    }

    const footerWeight = joined.match(/Peso Total do Pedido\s*:?\s*([\d.,]+)/i);
    const footerValue = joined.match(/Valor Total do Pedido\s*:?\s*R\$\s*([\d.,]+)/i);

    const totalWeightKg = items.reduce((a, i) => a + i.unitWeightKg * i.quantity, 0);
    const totalValueBrl = items.reduce((a, i) => a + i.unitValueBrl * i.quantity, 0);

    pedidos.push({
      pedidoNumber,
      supplierName,
      supplierDocument,
      orderDate,
      items,
      totalWeightKg,
      totalValueBrl,
      footerWeightKg: footerWeight ? brNum(footerWeight[1]) : null,
      footerValueBrl: footerValue ? brNum(footerValue[1]) : null,
    });
  }

  return pedidos.filter((p) => p.pedidoNumber || p.items.length > 0);
}
