import { supabase } from "@/integrations/supabase/client";
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

export type PurchaseItemType = "peca" | "peca_sacola" | "ceramico";

export interface PurchaseQuoteItem {
  id: string;
  itemType: PurchaseItemType;
  quantity?: number;
  totalValue?: number;
  weight?: number;
  input?: CalculatorInput;
  result?: CalculatorResult;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  erpNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  items: PurchaseQuoteItem[];
  totalBrl: number;
  notes: string;
  statusHistory: { status: PurchaseStatus; date: string }[];
}

function calcTotal(items: PurchaseQuoteItem[]): number {
  return items.reduce((sum, q) => {
    if (q.itemType === "peca" || (q.itemType === "peca_sacola" && !q.result)) {
      return sum + (q.totalValue || 0);
    }
    return sum + (q.result?.finalValueBrl || 0);
  }, 0);
}

export async function loadPurchases(): Promise<Purchase[]> {
  const { data: rows, error } = await supabase
    .from("purchases")
    .select("*")
    .order("date", { ascending: false });

  if (error || !rows) return [];

  const ids = rows.map((r: any) => r.id);
  const { data: itemRows } = await supabase
    .from("purchase_items")
    .select("*")
    .in("purchase_id", ids.length > 0 ? ids : ["__none__"]);

  const itemsByPurchase: Record<string, PurchaseQuoteItem[]> = {};
  (itemRows || []).forEach((item: any) => {
    if (!itemsByPurchase[item.purchase_id]) itemsByPurchase[item.purchase_id] = [];
    itemsByPurchase[item.purchase_id].push({
      id: item.id,
      itemType: item.item_type as PurchaseItemType,
      quantity: item.quantity,
      totalValue: item.total_value ? Number(item.total_value) : undefined,
      weight: item.weight ? Number(item.weight) : undefined,
      input: item.calc_input as CalculatorInput | undefined,
      result: item.calc_result as CalculatorResult | undefined,
    });
  });

  return rows.map((r: any) => ({
    id: r.id,
    purchaseNumber: r.purchase_number,
    erpNumber: r.erp_number || "",
    date: r.date,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    status: r.status as PurchaseStatus,
    items: itemsByPurchase[r.id] || [],
    totalBrl: Number(r.total_brl) || 0,
    notes: r.notes || "",
    statusHistory: (r.status_history as any[]) || [],
  }));
}

export async function createPurchase(data: {
  supplierId: string;
  supplierName: string;
  items: PurchaseQuoteItem[];
  notes?: string;
  erpNumber?: string;
}): Promise<Purchase | null> {
  // Generate purchase number via DB function
  const { data: numData } = await supabase.rpc("generate_purchase_number");
  const purchaseNumber = numData || new Date().toLocaleDateString("pt-BR");

  const totalBrl = calcTotal(data.items);

  const statusHistory = [{ status: "Recebimento" as PurchaseStatus, date: new Date().toISOString() }];

  const { data: row, error } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber,
      erp_number: data.erpNumber || "",
      supplier_id: data.supplierId,
      supplier_name: data.supplierName,
      status: "Recebimento",
      total_brl: totalBrl,
      notes: data.notes || "",
      status_history: statusHistory,
    })
    .select()
    .single();

  if (error || !row) return null;

  // Insert items
  if (data.items.length > 0) {
    await supabase.from("purchase_items").insert(
      data.items.map((i) => ({
        purchase_id: row.id,
        item_type: i.itemType,
        quantity: i.quantity || null,
        total_value: i.totalValue || null,
        weight: i.weight || null,
        calc_input: (i.input as any) || null,
        calc_result: (i.result as any) || null,
      }))
    );
  }

  return {
    id: row.id,
    purchaseNumber: row.purchase_number,
    erpNumber: row.erp_number || "",
    date: row.date,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    status: row.status as PurchaseStatus,
    items: data.items,
    totalBrl,
    notes: data.notes || "",
    statusHistory,
  };
}

export async function updatePurchaseStatus(id: string, status: PurchaseStatus) {
  const { data: current } = await supabase.from("purchases").select("status_history").eq("id", id).single();
  if (!current) return null;

  const history = [...((current.status_history as any[]) || []), { status, date: new Date().toISOString() }];

  // Run status action hook
  onStatusChange(id, status);

  const { data: updated } = await supabase
    .from("purchases")
    .update({ status, status_history: history })
    .eq("id", id)
    .select()
    .single();

  return updated;
}

export async function updatePurchase(id: string, data: { items: PurchaseQuoteItem[]; notes: string; erpNumber?: string }) {
  const totalBrl = calcTotal(data.items);

  // Delete existing items and re-insert
  await supabase.from("purchase_items").delete().eq("purchase_id", id);

  if (data.items.length > 0) {
    await supabase.from("purchase_items").insert(
      data.items.map((i) => ({
        purchase_id: id,
        item_type: i.itemType,
        quantity: i.quantity || null,
        total_value: i.totalValue || null,
        weight: i.weight || null,
        calc_input: (i.input as any) || null,
        calc_result: (i.result as any) || null,
      }))
    );
  }

  const updateData: any = { total_brl: totalBrl, notes: data.notes };
  if (data.erpNumber !== undefined) updateData.erp_number = data.erpNumber;

  await supabase.from("purchases").update(updateData).eq("id", id);
}

export async function deletePurchase(id: string) {
  await supabase.from("purchases").delete().eq("id", id);
}

// ===== Status Action Hook (structure for future automatic actions) =====
type StatusActionHandler = (purchaseId: string, newStatus: PurchaseStatus) => void;

const statusActions: Partial<Record<PurchaseStatus, StatusActionHandler[]>> = {
  // Add handlers here per status, e.g.:
  // "Conferência": [(id) => console.log("Moved to Conferência", id)],
};

function onStatusChange(purchaseId: string, newStatus: PurchaseStatus) {
  const handlers = statusActions[newStatus];
  if (handlers) {
    handlers.forEach((fn) => fn(purchaseId, newStatus));
  }
}

export function registerStatusAction(status: PurchaseStatus, handler: StatusActionHandler) {
  if (!statusActions[status]) statusActions[status] = [];
  statusActions[status]!.push(handler);
}
