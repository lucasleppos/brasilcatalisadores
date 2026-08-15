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
  /** Texto do modelo que ficou em linhas vizinhas por quebra de célula */
  modelSuffix?: string;
}

const isBareNumber = (l: string) => /^[\d.,]+$/.test(l.trim()) && /\d/.test(l);

/**
 * Normaliza linhas para leitura de itens.
 * Quando o valor unitário passa de mil, o PDF quebra a célula em três rows:
 *   "R$" / "CC* SERIE CC HONDA - HONDA 2 0,890g" / "1.014,90"
 * e o modelo longo pode vazar para as mesmas rows:
 *   "VOLKSWAGEN - AMAROK 2.0 R$" / "2H0131765A 2H0214AC 1 3,040g" / "biturbo 1.958,82"
 */
function normalizeLines(lines: string[]): RawItemLine[] {
  const out: RawItemLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) continue;

    if (/R\$\s*$/.test(line)) {
      const prefix = line.replace(/R\$\s*$/, "").trim();
      const itemLine = (lines[i + 1] || "").trim();
      const tail = (lines[i + 2] || "").trim();
      const tailValue = tail.match(/([\d.,]+)\s*$/);

      if (itemLine && !isBareNumber(itemLine) && tailValue) {
        const extra = tail.slice(0, tailValue.index).trim();
        out.push({
          text: itemLine,
          forcedValue: brNum(tailValue[1]),
          modelSuffix: [prefix, extra].filter(Boolean).join(" ").trim() || undefined,
        });
        i += 2;
        continue;
      }

      // Ordem invertida: "R$" / "1.014,90" / linha do item
      if (isBareNumber(itemLine) && tail && !isBareNumber(tail)) {
        out.push({ text: tail, forcedValue: brNum(itemLine), modelSuffix: prefix || undefined });
        i += 2;
        continue;
      }

      if (prefix) out.push({ text: prefix });
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
  const norm = normalizeLines(raw);
  const texts = norm.map((n) => n.text);

  // Divide o arquivo em blocos por "Pedido Nº"
  const starts: number[] = [];
  texts.forEach((l, i) => {
    if (/Pedido\s*N[ºo°]/i.test(l)) starts.push(i);
  });
  if (starts.length === 0) return [];

  const pedidos: ParsedPedido[] = [];

  for (let s = 0; s < starts.length; s++) {
    const block = norm.slice(starts[s], starts[s + 1] ?? norm.length);
    const blockTexts = block.map((b) => b.text);
    const joined = blockTexts.join("\n");

    const numMatch = joined.match(/Pedido\s*N[ºo°]\s*:?\s*(\S+)/i);
    const pedidoNumber = numMatch ? numMatch[1] : "";

    const docMatch = joined.match(/(?:CPF|CNPJ)\s*:?\s*([\d.\-/\s]{11,20})/i);
    let supplierDocument = docMatch ? onlyDigits(docMatch[1]) : "";

    // Nome do fornecedor: pode vir na mesma linha do rótulo ou na linha seguinte
    // ("Cliente   CPF" / "JULIO SERGIO GONÇALVES - JULIO SERGIO   006.133.971-77")
    let supplierName = "";
    const cliIdx = blockTexts.findIndex((l) => /^Cliente\b/i.test(l));
    if (cliIdx > -1) {
      const inline = blockTexts[cliIdx].replace(/^Cliente\s*:?\s*/i, "").replace(/\s*(?:CPF|CNPJ)\s*:?\s*$/i, "").trim();
      const candidate = /[A-Za-zÀ-ÿ]{3}/.test(inline) ? inline : (blockTexts[cliIdx + 1] || "").trim();
      // remove o documento que vem na mesma linha (coluna à direita)
      const docInline = candidate.match(/([\d]{3}\.?[\d]{3}\.?[\d]{3}-?[\d]{2}|[\d]{2}\.?[\d]{3}\.?[\d]{3}\/?[\d]{4}-?[\d]{2})\s*$/);
      if (docInline) {
        if (!supplierDocument) supplierDocument = onlyDigits(docInline[1]);
        supplierName = candidate.slice(0, docInline.index).trim();
      } else {
        supplierName = candidate;
      }
      supplierName = supplierName.replace(/\s*(?:CPF|CNPJ).*$/i, "").trim();
    }

    // Data: na linha do rótulo ou na linha seguinte ("Data do Pedido  Status" / "14/08/2026  pendente")
    let orderDate = "";
    const dtIdx = blockTexts.findIndex((l) => /Data do Pedido/i.test(l));
    if (dtIdx > -1) {
      const sameLine = blockTexts[dtIdx].match(/(\d{2}\/\d{2}\/\d{4})/);
      const nextLine = (blockTexts[dtIdx + 1] || "").match(/(\d{2}\/\d{2}\/\d{4})/);
      orderDate = sameLine?.[1] || nextLine?.[1] || "";
    }

    const items: ParsedPedidoItem[] = [];
    for (const entry of block) {
      if (/^C[óo]digo\b/i.test(entry.text)) continue;
      if (/Total|Resumo|Quantidade Total|Peso Total|Valor Total/i.test(entry.text)) continue;
      const item = parseItemLine(entry);
      if (item) items.push(item);
    }

    const footerWeight = joined.match(/Peso Total do Pedido\s*:?\s*([\d.,]+)/i);
    const footerValue = joined.match(/Valor Total do Pedido\s*:?\s*R\$\s*([\d.,]+)/i);

    // Valor e peso do PDF são unitários: totais = unitário × quantidade
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
