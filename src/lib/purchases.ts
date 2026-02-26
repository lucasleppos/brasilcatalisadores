import { CalculatorInput, CalculatorResult } from "./calculator";

export const PURCHASE_STATUSES = [
  "Recebimento",
  "Conferência",
  "Separação",
  "Corte da Peça",
  "Trituração",
  "Homogeneização",
  "Amostragem",
  "Análise",
  "Aprovação do Fornecedor",
  "Pagamento",
  "Enviado ao Bag",
  "Exportação/Venda",
] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export interface PurchaseQuoteItem {
  id: string;
  input: CalculatorInput;
  result: CalculatorResult;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  items: PurchaseQuoteItem[];
  totalBrl: number;
  notes: string;
  statusHistory: { status: PurchaseStatus; date: string }[];
}

const STORAGE_KEY = "catalisador-pro-purchases";

export function loadPurchases(): Purchase[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function savePurchases(purchases: Purchase[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

export function createPurchase(data: {
  supplierId: string;
  supplierName: string;
  items: PurchaseQuoteItem[];
  notes?: string;
}): Purchase {
  const purchases = loadPurchases();
  const totalBrl = data.items.reduce((sum, q) => sum + q.result.finalValueBrl, 0);
  const purchase: Purchase = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    status: "Recebimento",
    items: data.items,
    totalBrl,
    notes: data.notes || "",
    statusHistory: [{ status: "Recebimento", date: new Date().toISOString() }],
  };
  purchases.unshift(purchase);
  savePurchases(purchases);
  return purchase;
}

export function updatePurchaseStatus(id: string, status: PurchaseStatus) {
  const purchases = loadPurchases();
  const idx = purchases.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  purchases[idx].status = status;
  purchases[idx].statusHistory.push({ status, date: new Date().toISOString() });
  savePurchases(purchases);
  return purchases[idx];
}

export function deletePurchase(id: string) {
  const purchases = loadPurchases().filter((p) => p.id !== id);
  savePurchases(purchases);
}
