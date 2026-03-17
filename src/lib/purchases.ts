import { supabase } from "@/integrations/supabase/client";
import { CalculatorInput, CalculatorResult, calculate } from "./calculator";
import { createDemonstrativo } from "./demonstrativos";
import { loadSettings } from "./settings";

// ===== Material Flow Types =====
export type MaterialFlow = "pecas" | "ceramico";
export type PurchaseItemType = "peca" | "peca_sacola" | "ceramico";

// ===== Status Definitions =====

// Common statuses (both flows)
const COMMON_STATUSES = [
  "Aguardando Inclusão",
  "Aguardando Conferência",
  "Em Conferência",
] as const;

// Peças flow statuses
const PECAS_STATUSES = [
  "Peças: Aguardando Demonstrativo",
  "Peças: Gerar Boleto de Aprovação",
  "Peças: Demonstrativo Contestado",
  "Peças: Aprovado - Aguardando Pagamento",
  "Peças: Pagamento Realizado",
  "Peças: Em Corte",
  "Peças: Em Trituração",
  "Peças: Em Amostragem",
  "Peças: Pesagem Realizada",
  "Peças: Peso Divergente",
  "Peças: Alocado ao Bag",
  "Peças: Encerrado",
] as const;

// Cerâmico flow statuses
const CERAMICO_STATUSES = [
  "Cerâmico: Em Separação",
  "Cerâmico: Em Trituração/Homogeneização",
  "Cerâmico: Amostra Enviada ao Lab",
  "Cerâmico: Lab em Análise",
  "Cerâmico: Resultado Incluído",
  "Cerâmico: Em Precificação",
  "Cerâmico: Gerar Boleto de Aprovação",
  "Cerâmico: Demonstrativo Contestado",
  "Cerâmico: Aprovado",
  "Cerâmico: Encerrado",
] as const;

// Cerâmico parallel sub-statuses
export const CER_FIN_STATUSES = [
  "Aguardando Pagamento",
  "Pagamento Realizado",
  "Encerrado ERP",
] as const;

export const CER_OP_STATUSES = [
  "Alocando Bag",
  "Bag Alocado",
  "Enviado Exportação",
] as const;

// Legacy statuses (for backward compatibility)
const LEGACY_STATUSES = [
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

// All possible statuses
export const ALL_STATUSES = [
  ...COMMON_STATUSES,
  ...PECAS_STATUSES,
  ...CERAMICO_STATUSES,
  ...LEGACY_STATUSES,
] as const;

// Keep old export for backward compat
export const PURCHASE_STATUSES = ALL_STATUSES;

export type PurchaseStatus = string;
export type CerFinStatus = (typeof CER_FIN_STATUSES)[number];
export type CerOpStatus = (typeof CER_OP_STATUSES)[number];

// ===== Workflow: Stage → Role mapping =====
export const STAGE_ROLES: Record<string, string[]> = {
  // Common
  "Aguardando Inclusão": ["admin", "super_admin"],
  "Aguardando Conferência": ["operacional"],
  "Em Conferência": ["operacional"],
  // Peças
  "Peças: Aguardando Demonstrativo": ["admin", "super_admin"],
  "Peças: Gerar Boleto de Aprovação": ["admin", "super_admin"],
  "Peças: Demonstrativo Contestado": ["admin", "super_admin"],
  "Peças: Aprovado - Aguardando Pagamento": ["admin", "super_admin"],
  "Peças: Pagamento Realizado": ["admin", "super_admin"],
  "Peças: Em Corte": ["operacional"],
  "Peças: Em Trituração": ["operacional"],
  "Peças: Em Amostragem": ["operacional"],
  "Peças: Pesagem Realizada": ["operacional"],
  "Peças: Peso Divergente": ["admin", "super_admin"],
  "Peças: Alocado ao Bag": ["admin", "super_admin"],
  "Peças: Encerrado": [],
  // Cerâmico
  "Cerâmico: Em Separação": ["operacional"],
  "Cerâmico: Em Trituração/Homogeneização": ["operacional"],
  "Cerâmico: Amostra Enviada ao Lab": ["operacional"],
  "Cerâmico: Lab em Análise": ["laboratorio"],
  "Cerâmico: Resultado Incluído": ["laboratorio"],
  "Cerâmico: Em Precificação": ["admin", "super_admin"],
  "Cerâmico: Gerar Boleto de Aprovação": ["admin", "super_admin"],
  "Cerâmico: Demonstrativo Contestado": ["admin", "super_admin"],
  "Cerâmico: Aprovado": ["admin", "super_admin"],
  "Cerâmico: Encerrado": [],
  // Legacy
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

// ===== State Machine =====

export const PECAS_FLOW: string[] = [
  ...COMMON_STATUSES,
  "Peças: Aguardando Demonstrativo",
  "Peças: Gerar Boleto de Aprovação",
  // "Peças: Demonstrativo Contestado" is a loop state, not in linear sequence
  "Peças: Aprovado - Aguardando Pagamento",
  "Peças: Pagamento Realizado",
  "Peças: Em Corte",
  "Peças: Em Trituração",
  "Peças: Em Amostragem",
  "Peças: Pesagem Realizada",
  // "Peças: Peso Divergente" is a special state, not in linear sequence
  "Peças: Alocado ao Bag",
  "Peças: Encerrado",
];

export const CERAMICO_FLOW: string[] = [
  ...COMMON_STATUSES,
  "Cerâmico: Em Separação",
  "Cerâmico: Em Trituração/Homogeneização",
  "Cerâmico: Amostra Enviada ao Lab",
  "Cerâmico: Lab em Análise",
  "Cerâmico: Resultado Incluído",
  "Cerâmico: Em Precificação",
  "Cerâmico: Gerar Boleto de Aprovação",
  // "Cerâmico: Demonstrativo Contestado" is a loop state
  "Cerâmico: Aprovado",
  // After Aprovado, parallel sub-flows start — no more linear progression
  "Cerâmico: Encerrado",
];

export const LEGACY_FLOW: string[] = [...LEGACY_STATUSES];

export function getFlowStatuses(materialFlow: MaterialFlow | null): string[] {
  if (materialFlow === "pecas") return PECAS_FLOW;
  if (materialFlow === "ceramico") return CERAMICO_FLOW;
  return LEGACY_FLOW;
}

export function getNextStatus(current: string, materialFlow: MaterialFlow | null): string | null {
  // Handle special states
  if (current === "Peças: Demonstrativo Contestado") return "Peças: Aguardando Demonstrativo";
  if (current === "Cerâmico: Demonstrativo Contestado") return "Cerâmico: Em Trituração/Homogeneização";
  if (current === "Peças: Peso Divergente") return "Peças: Alocado ao Bag";

  // For ceramico, after "Aprovado" there's no single next — parallel sub-flows start
  if (current === "Cerâmico: Aprovado") return null;
  if (current === "Peças: Encerrado" || current === "Cerâmico: Encerrado") return null;

  const flow = getFlowStatuses(materialFlow);
  const idx = flow.indexOf(current);
  if (idx < 0 || idx >= flow.length - 1) return null;

  // Bifurcation: after "Em Conferência", jump to the correct flow
  if (current === "Em Conferência") {
    if (materialFlow === "pecas") return "Peças: Aguardando Demonstrativo";
    if (materialFlow === "ceramico") return "Cerâmico: Em Separação";
  }

  return flow[idx + 1];
}

export function getNextFinStatus(current: CerFinStatus): CerFinStatus | null {
  const idx = CER_FIN_STATUSES.indexOf(current);
  if (idx < 0 || idx >= CER_FIN_STATUSES.length - 1) return null;
  return CER_FIN_STATUSES[idx + 1];
}

export function getNextOpStatus(current: CerOpStatus): CerOpStatus | null {
  const idx = CER_OP_STATUSES.indexOf(current);
  if (idx < 0 || idx >= CER_OP_STATUSES.length - 1) return null;
  return CER_OP_STATUSES[idx + 1];
}

export function canUserActOnStage(role: string | null, status: string): boolean {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;
  return STAGE_ROLES[status]?.includes(role) ?? false;
}

/** Determine material flow from items */
export function determineMaterialFlow(items: PurchaseQuoteItem[]): MaterialFlow {
  const hasCeramicFlow = items.some(i =>
    i.itemType === "ceramico" ||
    (i.itemType === "peca_sacola" && i.input && !i.totalValue)
  );
  return hasCeramicFlow ? "ceramico" : "pecas";
}

// ===== Types =====

export interface PurchaseQuoteItem {
  id: string;
  itemType: PurchaseItemType;
  quantity?: number;
  totalValue?: number;
  weight?: number;
  input?: CalculatorInput;
  result?: CalculatorResult;
  category?: string;
  catalogPartId?: string;
  weightReal?: number;
  weightLoss?: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  erpNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  buyer: string;
  status: PurchaseStatus;
  materialFlow: MaterialFlow | null;
  items: PurchaseQuoteItem[];
  totalBrl: number;
  notes: string;
  statusHistory: { status: string; date: string }[];
  weightDeclared: number | null;
  weightReal: number | null;
  weightLoss: number | null;
  finStatus: CerFinStatus | null;
  opStatus: CerOpStatus | null;
  bulkWeight: number | null;
}

function calcTotal(items: PurchaseQuoteItem[]): number {
  return items.reduce((sum, q) => {
    if (q.itemType === "peca" || (q.itemType === "peca_sacola" && !q.result)) {
      return sum + (q.totalValue || 0);
    }
    return sum + (q.result?.finalValueBrl || 0);
  }, 0);
}

// ===== CRUD =====

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
      category: (item as any).category || undefined,
      catalogPartId: item.catalog_part_id || undefined,
      weightReal: item.weight_real != null ? Number(item.weight_real) : undefined,
      weightLoss: item.weight_loss != null ? Number(item.weight_loss) : undefined,
    });
  });

  return rows.map((r: any) => ({
    id: r.id,
    purchaseNumber: r.purchase_number,
    erpNumber: r.erp_number || "",
    date: r.date,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    buyer: r.buyer || "",
    status: r.status as PurchaseStatus,
    materialFlow: (r.material_flow as MaterialFlow) || null,
    items: itemsByPurchase[r.id] || [],
    totalBrl: Number(r.total_brl) || 0,
    notes: r.notes || "",
    statusHistory: (r.status_history as any[]) || [],
    weightDeclared: r.weight_declared != null ? Number(r.weight_declared) : null,
    weightReal: r.weight_real != null ? Number(r.weight_real) : null,
    weightLoss: r.weight_loss != null ? Number(r.weight_loss) : null,
    finStatus: (r.fin_status as CerFinStatus) || null,
    opStatus: (r.op_status as CerOpStatus) || null,
    bulkWeight: r.bulk_weight != null ? Number(r.bulk_weight) : null,
  }));
}

export async function createPurchase(data: {
  supplierId: string;
  supplierName: string;
  buyer: string;
  items: PurchaseQuoteItem[];
  notes?: string;
  erpNumber?: string;
  bulkWeight?: number | null;
}): Promise<Purchase | null> {
  const { data: numData } = await supabase.rpc("generate_purchase_number");
  const purchaseNumber = numData || new Date().toLocaleDateString("pt-BR");

  const totalBrl = calcTotal(data.items);
  const materialFlow = determineMaterialFlow(data.items);
  const initialStatus = "Aguardando Inclusão";
  const statusHistory = [{ status: initialStatus, date: new Date().toISOString() }];

  const { data: row, error } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber,
      erp_number: data.erpNumber || "",
      supplier_id: data.supplierId,
      supplier_name: data.supplierName,
      buyer: data.buyer,
      status: initialStatus,
      material_flow: materialFlow,
      total_brl: totalBrl,
      notes: data.notes || "",
      status_history: statusHistory,
      bulk_weight: data.bulkWeight ?? null,
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
        category: i.category || null,
        catalog_part_id: i.catalogPartId || null,
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
    buyer: data.buyer,
    status: initialStatus,
    materialFlow,
    items: data.items,
    totalBrl,
    notes: data.notes || "",
    statusHistory,
    weightDeclared: null,
    weightReal: null,
    weightLoss: null,
    finStatus: null,
    opStatus: null,
    bulkWeight: data.bulkWeight ?? null,
  };
}

export async function updatePurchaseStatus(id: string, status: string) {
  const { data: current } = await supabase.from("purchases").select("status_history").eq("id", id).single();
  if (!current) return null;

  const history = [...((current.status_history as any[]) || []), { status, date: new Date().toISOString() }];

  const updateData: any = { status, status_history: history };

  // If entering "Cerâmico: Aprovado", initialize parallel sub-flows
  if (status === "Cerâmico: Aprovado") {
    updateData.fin_status = "Aguardando Pagamento";
    updateData.op_status = "Alocando Bag";
  }

  const { data: updated } = await supabase
    .from("purchases")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  return updated;
}

/** Advance to next status automatically (used by workflow) */
export async function advanceStage(id: string, currentStatus: string): Promise<boolean> {
  // Get purchase to know material_flow
  const { data: purchase } = await supabase.from("purchases").select("material_flow").eq("id", id).single();
  const materialFlow = (purchase?.material_flow as MaterialFlow) || null;
  const next = getNextStatus(currentStatus, materialFlow);
  if (!next) return false;
  const result = await updatePurchaseStatus(id, next);
  return !!result;
}

/** Advance financial sub-status (cerâmico) */
export async function advanceFinStatus(id: string, currentFinStatus: CerFinStatus): Promise<boolean> {
  const next = getNextFinStatus(currentFinStatus);
  if (!next) return false;

  const { data: current } = await supabase.from("purchases").select("status_history, op_status").eq("id", id).single();
  if (!current) return false;

  const history = [...((current.status_history as any[]) || []), { status: `Fin: ${next}`, date: new Date().toISOString() }];
  const updateData: any = { fin_status: next, status_history: history };

  // Check if both sub-flows are done
  if (next === "Encerrado ERP" && current.op_status === "Enviado Exportação") {
    updateData.status = "Cerâmico: Encerrado";
    history.push({ status: "Cerâmico: Encerrado", date: new Date().toISOString() });
  }

  await supabase.from("purchases").update(updateData).eq("id", id);
  return true;
}

/** Advance operational sub-status (cerâmico) */
export async function advanceOpStatus(id: string, currentOpStatus: CerOpStatus): Promise<boolean> {
  const next = getNextOpStatus(currentOpStatus);
  if (!next) return false;

  const { data: current } = await supabase.from("purchases").select("status_history, fin_status").eq("id", id).single();
  if (!current) return false;

  const history = [...((current.status_history as any[]) || []), { status: `Op: ${next}`, date: new Date().toISOString() }];
  const updateData: any = { op_status: next, status_history: history };

  // Check if both sub-flows are done
  if (next === "Enviado Exportação" && current.fin_status === "Encerrado ERP") {
    updateData.status = "Cerâmico: Encerrado";
    history.push({ status: "Cerâmico: Encerrado", date: new Date().toISOString() });
  }

  await supabase.from("purchases").update(updateData).eq("id", id);
  return true;
}

/** Handle weight check — compare declared vs real */
export async function handleWeightCheck(purchaseId: string, weightReal: number): Promise<boolean> {
  const { data: purchase } = await supabase.from("purchases").select("weight_declared, status_history, status").eq("id", purchaseId).single();
  if (!purchase) return false;

  const weightDeclared = Number(purchase.weight_declared) || 0;
  const weightLoss = weightDeclared > 0 ? weightDeclared - weightReal : 0;
  const isDivergent = weightDeclared > 0 && Math.abs(weightLoss) > 0.5; // tolerance 0.5kg

  const history = [...((purchase.status_history as any[]) || [])];
  const newStatus = isDivergent ? "Peças: Peso Divergente" : "Peças: Alocado ao Bag";
  history.push({ status: newStatus, date: new Date().toISOString() });

  await supabase.from("purchases").update({
    weight_real: weightReal,
    weight_loss: weightLoss,
    status: newStatus,
    status_history: history,
  }).eq("id", purchaseId);

  return true;
}

/** Register lab analysis: update PPMs on items, recalculate values, create lab_result, advance status */
export async function registerAnalysis(
  purchaseId: string,
  ppmData: { ptPpm: number; pdPpm: number; rhPpm: number },
  userId?: string
): Promise<boolean> {
  const [settings, { data: items }] = await Promise.all([
    loadSettings(),
    supabase.from("purchase_items").select("*").eq("purchase_id", purchaseId),
  ]);

  if (!items) return false;

  // Create lab_result record
  const { data: existingLabs } = await supabase
    .from("lab_results")
    .select("versao")
    .eq("purchase_id", purchaseId)
    .order("versao", { ascending: false })
    .limit(1);

  const nextVersion = ((existingLabs?.[0] as any)?.versao || 0) + 1;

  await supabase.from("lab_results").insert({
    purchase_id: purchaseId,
    versao: nextVersion,
    pt_ppm: ppmData.ptPpm,
    pd_ppm: ppmData.pdPpm,
    rh_ppm: ppmData.rhPpm,
    created_by: userId || null,
  });

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
    category: i.category || undefined,
    catalogPartId: i.catalog_part_id || undefined,
    weightReal: i.weight_real != null ? Number(i.weight_real) : undefined,
    weightLoss: i.weight_loss != null ? Number(i.weight_loss) : undefined,
  }));

  const newTotal = calcTotal(mappedItems);
  await supabase.from("purchases").update({ total_brl: newTotal }).eq("id", purchaseId);

  // Determine which status to advance from
  const { data: purchase } = await supabase.from("purchases").select("status, material_flow").eq("id", purchaseId).single();
  if (!purchase) return false;

  const status = purchase.status;
  // Legacy "Análise" or new "Cerâmico: Lab em Análise"
  if (status === "Análise" || status === "Cerâmico: Lab em Análise") {
    return advanceStage(purchaseId, status);
  }

  return true;
}

export async function updatePurchase(id: string, data: { items: PurchaseQuoteItem[]; notes: string; erpNumber?: string; bulkWeight?: number | null }) {
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
        category: i.category || null,
        catalog_part_id: i.catalogPartId || null,
      }))
    );
  }

  // Recalculate material_flow
  const materialFlow = determineMaterialFlow(data.items);
  const updateData: any = { total_brl: totalBrl, notes: data.notes, material_flow: materialFlow };
  if (data.erpNumber !== undefined) updateData.erp_number = data.erpNumber;
  if (data.bulkWeight !== undefined) updateData.bulk_weight = data.bulkWeight;

  await supabase.from("purchases").update(updateData).eq("id", id);
}

export async function deletePurchase(id: string) {
  await supabase.from("purchases").delete().eq("id", id);
}

/** Register real weight for a purchase item (post-handling) */
export async function registerItemRealWeight(itemId: string, weightReal: number): Promise<boolean> {
  const { data: item } = await supabase.from("purchase_items").select("weight").eq("id", itemId).single();
  if (!item) return false;

  const catalogWeight = Number(item.weight) || 0;
  const weightLoss = catalogWeight > 0 ? catalogWeight - weightReal : 0;

  const { error } = await supabase
    .from("purchase_items")
    .update({ weight_real: weightReal, weight_loss: weightLoss })
    .eq("id", itemId);

  return !error;
}

// ===== Status Labels & Colors =====

export const STATUS_LABELS: Record<string, string> = {
  "Aguardando Inclusão": "Aguardando Inclusão",
  "Aguardando Conferência": "Aguardando Conferência",
  "Em Conferência": "Em Conferência",
  // Use short labels for display
};

export function getStatusColor(status: string): string {
  // Common
  if (status.startsWith("Aguardando")) return "bg-blue-500/10 text-blue-700 border-blue-300";
  if (status.includes("Conferência")) return "bg-cyan-500/10 text-cyan-700 border-cyan-300";
  // Peças
  if (status.includes("Demonstrativo Contestado")) return "bg-red-500/10 text-red-700 border-red-300";
  if (status.includes("Gerar Boleto de Aprovação")) return "bg-emerald-500/10 text-emerald-700 border-emerald-300";
  if (status.includes("Demonstrativo")) return "bg-yellow-500/10 text-yellow-700 border-yellow-300";
  if (status.includes("Pagamento")) return "bg-green-500/10 text-green-700 border-green-300";
  if (status.includes("Peso Divergente")) return "bg-red-500/10 text-red-700 border-red-300";
  if (status.includes("Corte") || status.includes("Trituração") || status.includes("Amostragem")) return "bg-orange-500/10 text-orange-700 border-orange-300";
  if (status.includes("Pesagem")) return "bg-amber-500/10 text-amber-700 border-amber-300";
  if (status.includes("Encerrado") || status.includes("Exportação")) return "bg-primary/10 text-primary border-primary/30";
  if (status.includes("Aprovado") || status.includes("Aprovação")) return "bg-emerald-500/10 text-emerald-700 border-emerald-300";
  if (status.includes("Bag") || status.includes("Alocado")) return "bg-teal-500/10 text-teal-700 border-teal-300";
  if (status.includes("Separação")) return "bg-indigo-500/10 text-indigo-700 border-indigo-300";
  if (status.includes("Homogeneização")) return "bg-amber-500/10 text-amber-700 border-amber-300";
  if (status.includes("Lab") || status.includes("Análise")) return "bg-lime-500/10 text-lime-700 border-lime-300";
  if (status.includes("Resultado")) return "bg-lime-500/10 text-lime-700 border-lime-300";
  if (status.includes("Precificação")) return "bg-violet-500/10 text-violet-700 border-violet-300";
  // Legacy
  if (status === "Recebimento") return "bg-blue-500/10 text-blue-700 border-blue-300";
  return "bg-muted text-muted-foreground border-border";
}

/** Check if a purchase is fully closed */
export function isPurchaseClosed(purchase: Purchase): boolean {
  if (purchase.status === "Peças: Encerrado" || purchase.status === "Cerâmico: Encerrado" || purchase.status === "Exportação/Venda") {
    return true;
  }
  return false;
}

/** Check if cerâmico is in parallel phase */
export function isInParallelPhase(purchase: Purchase): boolean {
  return purchase.status === "Cerâmico: Aprovado" && purchase.finStatus != null && purchase.opStatus != null;
}
