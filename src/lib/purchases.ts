import { supabase } from "@/integrations/supabase/client";
import { CalculatorInput, CalculatorResult, calculate } from "./calculator";
import { loadSettings } from "./settings";
import { AppRole } from "@/contexts/AuthContext";

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

// ===== Workflow: Stage → Role mapping =====
export const STAGE_ROLES: Record<PurchaseStatus, AppRole[]> = {
  "Recebimento": ["operacional"],
  "Conferência": ["operacional"],
  "Separação": ["operacional"],
  "Corte da Peça": ["operacional"],
  "Trituração": ["operacional"],
  "Homogeneização": ["operacional"],
  "Amostragem": ["operacional"],
  "Análise": ["laboratorio"],
  "Aprovação do Fornecedor": ["admin", "super_admin"],
  "Pagamento": ["admin", "super_admin"],
  "Enviado ao Bag": ["admin", "super_admin"],
  "Exportação/Venda": ["admin", "super_admin"],
};

export function getNextStatus(current: PurchaseStatus): PurchaseStatus | null {
  const idx = PURCHASE_STATUSES.indexOf(current);
  if (idx < 0 || idx >= PURCHASE_STATUSES.length - 1) return null;
  return PURCHASE_STATUSES[idx + 1];
}

export function canUserActOnStage(role: AppRole | null, status: PurchaseStatus): boolean {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;
  return STAGE_ROLES[status]?.includes(role) ?? false;
}

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

  const { data: updated } = await supabase
    .from("purchases")
    .update({ status, status_history: history })
    .eq("id", id)
    .select()
    .single();

  return updated;
}

/** Advance to next status automatically (used by workflow) */
export async function advanceStage(id: string, currentStatus: PurchaseStatus): Promise<boolean> {
  const next = getNextStatus(currentStatus);
  if (!next) return false;
  const result = await updatePurchaseStatus(id, next);
  return !!result;
}

/** Register lab analysis: update PPMs on items, recalculate values, advance status */
export async function registerAnalysis(
  purchaseId: string,
  ppmData: { ptPpm: number; pdPpm: number; rhPpm: number }
): Promise<boolean> {
  // Load settings and purchase items
  const [settings, { data: items }] = await Promise.all([
    loadSettings(),
    supabase.from("purchase_items").select("*").eq("purchase_id", purchaseId),
  ]);

  if (!items) return false;

  // Update items that use calculator (ceramico and peca_sacola with calc_input)
  for (const item of items) {
    if (item.item_type === "peca") continue;

    const existingInput = item.calc_input as unknown as CalculatorInput | null;
    if (!existingInput) continue;

    const updatedInput: CalculatorInput = {
      ...existingInput,
      ptPpm: ppmData.ptPpm,
      pdPpm: ppmData.pdPpm,
      rhPpm: ppmData.rhPpm,
    };

    const result = calculate(updatedInput, settings);

    await supabase
      .from("purchase_items")
      .update({
        calc_input: updatedInput as any,
        calc_result: result as any,
      })
      .eq("id", item.id);
  }

  // Recalculate total
  const { data: updatedItems } = await supabase
    .from("purchase_items")
    .select("*")
    .eq("purchase_id", purchaseId);

  const mappedItems: PurchaseQuoteItem[] = (updatedItems || []).map((i: any) => ({
    id: i.id,
    itemType: i.item_type as PurchaseItemType,
    quantity: i.quantity,
    totalValue: i.total_value ? Number(i.total_value) : undefined,
    weight: i.weight ? Number(i.weight) : undefined,
    input: i.calc_input as CalculatorInput | undefined,
    result: i.calc_result as CalculatorResult | undefined,
  }));

  const newTotal = calcTotal(mappedItems);

  await supabase.from("purchases").update({ total_brl: newTotal }).eq("id", purchaseId);

  // Advance from Análise to Aprovação do Fornecedor
  return advanceStage(purchaseId, "Análise");
}

export async function updatePurchase(id: string, data: { items: PurchaseQuoteItem[]; notes: string; erpNumber?: string }) {
  const totalBrl = calcTotal(data.items);

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
