import { supabase } from "@/integrations/supabase/client";
import { CalculatorInput, CalculatorResult, calculate } from "./calculator";
import { createDemonstrativo } from "./demonstrativos";
import { loadSettings } from "./settings";
import { fmtNum } from "./utils";

// ===== Material Flow Types =====
export type MaterialFlow = "pecas" | "ceramico" | "sacola";
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
  "Peças: Trituração e Amostragem",
  "Peças: Laboratório",
  "Peças: Aguardando Demonstrativo",
  "Peças: Gerar Boleto de Aprovação",
  "Peças: Demonstrativo Contestado",
  "Peças: Aprovado - Aguardando Pagamento",
  "Peças: Pagamento Realizado",
  "Peças: Em Corte",
  "Peças: Em Trituração",
  "Peças: Em Amostragem",
  "Peças: Peso Divergente",
  "Peças: Alocado ao Bag",
  "Peças: Encerrado",

  "Concluído",
] as const;

// Cerâmico flow statuses
const CERAMICO_STATUSES = [
  "Cerâmico: Em Trituração/Homogeneização",
  "Cerâmico: Amostra Enviada ao Lab",
  "Cerâmico: Lab em Análise",
  "Cerâmico: Resultado Incluído",
  "Cerâmico: Em Precificação",
  "Cerâmico: Gerar Boleto de Aprovação",
  "Cerâmico: Demonstrativo Contestado",
  "Cerâmico: Aprovado",
  "Cerâmico: Encerrado",
  "Concluído",
] as const;

// Cerâmico operational sub-status (legado: fin_status deixou de ser usado)
export const CER_FIN_STATUSES = [] as const;

export const CER_OP_STATUSES = [
  "Alocando Bag",
  "Bag Alocado",
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
  "Peças: Trituração e Amostragem": ["operacional"],
  "Peças: Laboratório": ["laboratorio"],
  "Peças: Em Corte": ["operacional"],
  "Peças: Em Trituração": ["operacional"],
  "Peças: Em Amostragem": ["operacional"],
  "Peças: Peso Divergente": ["admin", "super_admin"],
  "Peças: Alocado ao Bag": ["admin", "super_admin"],
  "Peças: Encerrado": [],

  "Concluído": [],
  // Cerâmico
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
  "Peças: Em Corte",
  "Peças: Trituração e Amostragem",
  // "Peças: Peso Divergente" is a special state, not in linear sequence
  "Peças: Alocado ao Bag",
  "Concluído",
];

// Peça em Sacola: Conferência → Trituração (peça a peça) → Laboratório → Precificação → Aprovação → Bag
export const SACOLA_FLOW: string[] = [
  ...COMMON_STATUSES,
  "Peças: Em Trituração",
  "Peças: Laboratório",
  "Peças: Aguardando Demonstrativo",
  "Peças: Gerar Boleto de Aprovação",
  "Peças: Alocado ao Bag",
  "Concluído",
];


export const CERAMICO_FLOW: string[] = [
  ...COMMON_STATUSES,
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
  "Concluído",
];

export const LEGACY_FLOW: string[] = [...LEGACY_STATUSES];

export function getFlowStatuses(materialFlow: MaterialFlow | null): string[] {
  if (materialFlow === "pecas") return PECAS_FLOW;
  if (materialFlow === "sacola") return SACOLA_FLOW;
  if (materialFlow === "ceramico") return CERAMICO_FLOW;
  return LEGACY_FLOW;
}

export function getNextStatus(current: string, materialFlow: MaterialFlow | null): string | null {
  // Handle special states
  if (current === "Peças: Demonstrativo Contestado") return "Peças: Aguardando Demonstrativo";
  if (current === "Cerâmico: Demonstrativo Contestado") return "Cerâmico: Em Trituração/Homogeneização";
  if (current === "Peças: Peso Divergente") return "Peças: Alocado ao Bag";

  // Peça em Sacola: Conferência → Trituração → Laboratório → Precificação → Aprovação → Bag
  if (materialFlow === "sacola") {
    if (current === "Em Conferência") return "Peças: Em Trituração";
    if (current === "Peças: Em Trituração") return "Peças: Laboratório";
    if (current === "Peças: Laboratório") return "Peças: Aguardando Demonstrativo";
    if (current === "Peças: Aguardando Demonstrativo") return "Peças: Gerar Boleto de Aprovação";
    if (current === "Peças: Gerar Boleto de Aprovação") return "Peças: Alocado ao Bag";
    if (current === "Peças: Encerrado") return "Concluído";
    if (current === "Peças: Alocado ao Bag" || current === "Concluído") return null;
  }


  // Peças: após aprovação (boleto) segue para Corte → Trituração/Amostragem → Bag
  if (current === "Peças: Gerar Boleto de Aprovação") return "Peças: Em Corte";
  if (current === "Peças: Em Corte") return "Peças: Trituração e Amostragem";
  if (current === "Peças: Trituração e Amostragem") return "Peças: Alocado ao Bag";
  // Legado: status que saíram do fluxo linear
  if (current === "Peças: Laboratório") return "Peças: Aguardando Demonstrativo";
  if (current === "Peças: Em Trituração" || current === "Peças: Em Amostragem") return "Peças: Alocado ao Bag";
  if (current === "Peças: Aprovado - Aguardando Pagamento" || current === "Peças: Pagamento Realizado") return "Peças: Em Corte";

  // Skip intermediate ceramic stages and parallel sub-flows
  if (current === "Cerâmico: Em Trituração/Homogeneização") return "Cerâmico: Lab em Análise";
  // Ceramic flow now skips "Em Precificação" — after analysis go directly to approval
  if (current === "Cerâmico: Lab em Análise") return "Cerâmico: Gerar Boleto de Aprovação";
  if (current === "Cerâmico: Resultado Incluído") return "Cerâmico: Gerar Boleto de Aprovação";
  if (current === "Cerâmico: Em Precificação") return "Cerâmico: Gerar Boleto de Aprovação";
  if (current === "Cerâmico: Gerar Boleto de Aprovação") return "Cerâmico: Aprovado";
  // Keep legacy parallel support
  if (current === "Cerâmico: Aprovado") return null;
  if (current === "Concluído") return null;
  if (current === "Peças: Encerrado" || current === "Cerâmico: Encerrado") return "Concluído";

  const flow = getFlowStatuses(materialFlow);
  const idx = flow.indexOf(current);
  if (idx < 0 || idx >= flow.length - 1) return null;

  // Bifurcation: after "Em Conferência", jump to the correct flow
  if (current === "Em Conferência") {
    if (materialFlow === "pecas") return "Peças: Aguardando Demonstrativo";
    if (materialFlow === "ceramico") return "Cerâmico: Em Trituração/Homogeneização";
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
  if (items.some(i => i.itemType === "ceramico")) return "ceramico";
  if (items.some(i => i.itemType === "peca_sacola")) return "sacola";
  return "pecas";
}

/** Compras de Peça em Sacola (inclui compras antigas sem material_flow = "sacola") */
export function isSacolaFlow(purchase: Pick<Purchase, "materialFlow" | "items">): boolean {
  if (purchase.materialFlow === "sacola") return true;
  if (purchase.materialFlow === "ceramico") return false;
  return purchase.items.some(i => i.itemType === "peca_sacola");
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
  catalogPartCode?: string;
  catalogPartRef?: string;
  weightReal?: number;
  weightLoss?: number;
  /** Número fixo da peça/grupo definido na conferência */
  seq?: number;
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

/** Categoria dos itens separados na conferência (fora da margem de peso) */
export const EXCLUDED_CATEGORY = "conferencia_excluida";

/** Filter out conference-generated items — returns only the original purchase items */
export function getOriginalItems(purchase: Purchase): PurchaseQuoteItem[] {
  return purchase.items.filter(i => i.category !== "conferencia" && i.category !== EXCLUDED_CATEGORY);
}

/** Return only items generated during conference (peca_sacola individual pieces) */
export function getConferenciaItems(purchase: Purchase): PurchaseQuoteItem[] {
  return purchase.items.filter(i => i.category === "conferencia");
}

/** Peças separadas na conferência que não seguem o fluxo (irão para nova compra de cerâmico) */
export function getExcludedItems(purchase: Purchase): PurchaseQuoteItem[] {
  return purchase.items.filter(i => i.category === EXCLUDED_CATEGORY);
}


/** Sum quantities from original items only */
export function getOriginalItemCount(purchase: Purchase): number {
  return getOriginalItems(purchase).reduce((sum, i) => sum + (i.quantity || 1), 0);
}

/** Returns a human-readable label: weight for cerâmico, count for peças */
export function getItemLabel(purchase: Purchase): string {
  if (purchase.materialFlow === "ceramico") {
    const confItems = getConferenciaItems(purchase);
    if (confItems.length > 0) {
      const totalWeight = confItems.reduce((s, i) => s + (i.weight || 0), 0);
      return `${fmtNum(totalWeight, 3)} kg`;
    }
    return purchase.bulkWeight ? `${fmtNum(purchase.bulkWeight, 3)} kg` : "—";
  }
  // Peças / Peça em Sacola: prioriza os itens conferidos (os originais são removidos na conferência)
  const confItems = getConferenciaItems(purchase);
  let count = confItems.reduce((s, i) => s + (i.quantity || 1), 0);
  let weight = confItems.reduce((s, i) => s + (i.weight || 0), 0);
  if (count === 0) {
    count = getOriginalItemCount(purchase);
    weight = getOriginalItems(purchase).reduce((s, i) => s + (i.weight || 0), 0);
  }
  if (count === 0 && purchase.bulkWeight) count = purchase.bulkWeight;
  const base = `${count} ${count === 1 ? "peça" : "peças"}`;
  return weight > 0 ? `${base} · ${fmtNum(weight, 3)} kg` : base;
}

function calcTotal(items: PurchaseQuoteItem[]): number {
  // Only sum original items (exclude conference-generated ones which have no value yet)
  const original = items.filter(i => i.category !== "conferencia" && i.category !== EXCLUDED_CATEGORY);
  return original.reduce((sum, q) => {
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

  // Fetch catalog parts for items that have catalog_part_id
  const allCatalogPartIds = [...new Set(
    (itemRows || []).filter((i: any) => i.catalog_part_id).map((i: any) => i.catalog_part_id)
  )];
  let catalogPartsMap: Record<string, { code: string; reference: string }> = {};
  if (allCatalogPartIds.length > 0) {
    const { data: catalogParts } = await supabase
      .from("catalog_parts")
      .select("id, code, reference")
      .in("id", allCatalogPartIds);
    (catalogParts || []).forEach((cp: any) => {
      catalogPartsMap[cp.id] = { code: cp.code, reference: cp.reference };
    });
  }

  const itemsByPurchase: Record<string, PurchaseQuoteItem[]> = {};
  (itemRows || []).forEach((item: any) => {
    if (!itemsByPurchase[item.purchase_id]) itemsByPurchase[item.purchase_id] = [];
    const cp = item.catalog_part_id ? catalogPartsMap[item.catalog_part_id] : null;
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
      catalogPartCode: cp?.code || undefined,
      catalogPartRef: cp?.reference || undefined,
      weightReal: item.weight_real != null ? Number(item.weight_real) : undefined,
      weightLoss: item.weight_loss != null ? Number(item.weight_loss) : undefined,
      seq: (item as any).seq != null ? Number((item as any).seq) : undefined,
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
}): Promise<(Purchase & { duplicate?: boolean }) | null> {
  // Guarda anti-duplicação: mesma compra criada há poucos segundos (duplo clique / reenvio)
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await supabase
    .from("purchases")
    .select("*")
    .eq("supplier_id", data.supplierId)
    .eq("status", "Em Conferência")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);

  const dup = (recent || []).find(
    r => Number(r.bulk_weight ?? 0) === Number(data.bulkWeight ?? 0)
  );
  if (dup) {
    const { data: dupItems } = await supabase
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", dup.id);
    return {
      id: dup.id,
      purchaseNumber: dup.purchase_number,
      erpNumber: dup.erp_number || "",
      date: dup.date,
      supplierId: dup.supplier_id,
      supplierName: dup.supplier_name,
      buyer: dup.buyer || "",
      status: dup.status,
      materialFlow: (dup.material_flow as MaterialFlow) || null,
      items: mapItems(dupItems || []),
      totalBrl: Number(dup.total_brl) || 0,
      notes: dup.notes || "",
      statusHistory: (dup.status_history as any[]) || [],
      weightDeclared: dup.weight_declared != null ? Number(dup.weight_declared) : null,
      weightReal: dup.weight_real != null ? Number(dup.weight_real) : null,
      weightLoss: dup.weight_loss != null ? Number(dup.weight_loss) : null,
      finStatus: (dup.fin_status as CerFinStatus) || null,
      opStatus: (dup.op_status as CerOpStatus) || null,
      bulkWeight: dup.bulk_weight != null ? Number(dup.bulk_weight) : null,
      duplicate: true,
    };
  }

  const { data: numData } = await supabase.rpc("generate_purchase_number");
  const purchaseNumber = numData || new Date().toLocaleDateString("pt-BR").replace(/\//g, "").slice(0, 4) + new Date().toLocaleDateString("pt-BR").slice(-2) + "-01";


  const totalBrl = calcTotal(data.items);
  const materialFlow = determineMaterialFlow(data.items);
  
  // Both Peças and Cerâmico skip initial stages — go directly to "Em Conferência"
  let initialStatus: string;
  let statusHistory: { status: string; date: string }[];
  
  const now = new Date().toISOString();
  initialStatus = "Em Conferência";
  statusHistory = [
    { status: "Aguardando Inclusão", date: now },
    { status: "Aguardando Conferência", date: now },
    { status: "Em Conferência", date: now },
  ];

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

  // If entering "Cerâmico: Aprovado", initialize operational sub-flow (envio ao Bags)
  if (status === "Cerâmico: Aprovado") {
    updateData.op_status = "Alocando Bag";
  }

  const { data: updated } = await supabase
    .from("purchases")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  // Se a compra já estava totalmente alocada em bags, encerra automaticamente
  if (status === "Cerâmico: Aprovado") {
    await syncCeramicoAllocation(id);
  }

  return updated;
}

/**
 * Verifica se todos os itens de conferência de uma compra já estão alocados em
 * bags e, em caso positivo, encerra a compra (cerâmico e peças).
 */
export async function syncCeramicoAllocation(purchaseId: string): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("purchases")
    .select("status, op_status, material_flow, status_history")
    .eq("id", purchaseId)
    .single();
  if (!purchase) return false;

  const isCeramico = purchase.material_flow === "ceramico";
  const isPecas = purchase.material_flow === "pecas" || purchase.material_flow === "sacola";
  if (isCeramico && (purchase.status !== "Cerâmico: Aprovado" || purchase.op_status !== "Alocando Bag")) return false;
  if (isPecas && purchase.status !== "Peças: Alocado ao Bag") return false;
  if (!isCeramico && !isPecas) return false;

  const { data: confItems } = await supabase
    .from("purchase_items")
    .select("id")
    .eq("purchase_id", purchaseId)
    .eq("category", "conferencia");
  if (!confItems || confItems.length === 0) return false;

  const { data: allocatedItems } = await supabase
    .from("bag_items")
    .select("purchase_item_id")
    .eq("purchase_id", purchaseId);
  const allocatedSet = new Set((allocatedItems || []).map((a: any) => a.purchase_item_id));
  const remaining = confItems.filter((i: any) => !allocatedSet.has(i.id));
  if (remaining.length > 0) return false;

  if (isPecas) {
    const history = [...((purchase.status_history as any[]) || []), { status: "Peças: Encerrado", date: new Date().toISOString() }];
    await supabase.from("purchases").update({ status: "Peças: Encerrado", status_history: history }).eq("id", purchaseId);
    return true;
  }

  return await advanceOpStatus(purchaseId, "Alocando Bag");
}


/** Advance to next status automatically (used by workflow) */
export async function advanceStage(id: string, currentStatus: string): Promise<boolean> {
  // Get purchase to know material_flow and total
  const { data: purchase } = await supabase.from("purchases").select("material_flow, total_brl").eq("id", id).single();
  const materialFlow = (purchase?.material_flow as MaterialFlow) || null;
  const next = getNextStatus(currentStatus, materialFlow);
  if (!next) return false;
  const result = await updatePurchaseStatus(id, next);

  // Auto-create demonstrativo when entering a stage that requires it
  const demoStages = ["Peças: Gerar Boleto de Aprovação", "Peças: Aguardando Demonstrativo", "Cerâmico: Em Precificação", "Cerâmico: Gerar Boleto de Aprovação"];
  if (demoStages.includes(next)) {
    const totalBrl = Number(purchase?.total_brl) || 0;
    await createDemonstrativo(id, totalBrl);
  }

  return !!result;
}

/** Contest a demonstrativo — sets status to Contestado and reverts flow */
export async function contestDemonstrativo(purchaseId: string, motivo: string): Promise<boolean> {
  const { data: purchase } = await supabase.from("purchases").select("status, material_flow").eq("id", purchaseId).single();
  if (!purchase) return false;

  const isC = purchase.status.startsWith("Cerâmico");
  const contestedStatus = isC ? "Cerâmico: Demonstrativo Contestado" : "Peças: Demonstrativo Contestado";

  // Update demonstrativo with contestation reason
  const { data: demos } = await supabase
    .from("demonstrativos")
    .select("id")
    .eq("purchase_id", purchaseId)
    .eq("status", "pendente")
    .order("enviado_em", { ascending: false })
    .limit(1);

  if (demos && demos.length > 0) {
    await supabase.from("demonstrativos").update({
      status: "contestado",
      motivo_contestacao: motivo,
      respondido_em: new Date().toISOString(),
    }).eq("id", demos[0].id);
  }

  // Set status to Contestado first
  await updatePurchaseStatus(purchaseId, contestedStatus);
  // Then advance from Contestado (which reverts to Aguardando Demonstrativo / Trituração)
  const materialFlow = (purchase.material_flow as MaterialFlow) || null;
  const next = getNextStatus(contestedStatus, materialFlow);
  if (next) {
    await updatePurchaseStatus(purchaseId, next);
  }
  return true;
}

/** DEPRECATED — fluxo financeiro removido. Mantido como no-op para compatibilidade. */
export async function advanceFinStatus(_id: string, _currentFinStatus: CerFinStatus): Promise<boolean> {
  return false;
}

/** Advance operational sub-status (cerâmico) */
export async function advanceOpStatus(id: string, currentOpStatus: CerOpStatus): Promise<boolean> {
  const next = getNextOpStatus(currentOpStatus);
  if (!next) return false;

  const { data: current } = await supabase.from("purchases").select("status_history").eq("id", id).single();
  if (!current) return false;

  const history = [...((current.status_history as any[]) || []), { status: `Op: ${next}`, date: new Date().toISOString() }];
  const updateData: any = { op_status: next, status_history: history };

  // Quando termina de alocar todos os bags, encerra automaticamente
  if (next === "Bag Alocado") {
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
    seq: i.seq != null ? Number(i.seq) : undefined,
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
  // Reconciliação por id: atualiza o que existe, insere o que é novo e remove o que saiu.
  // Nunca recria itens de conferência (isso duplicava peças/grupos ao salvar a edição).
  const { data: existing } = await supabase
    .from("purchase_items")
    .select("id, category")
    .eq("purchase_id", id);
  const existingRows = existing || [];
  const existingIds = new Set(existingRows.map(r => r.id));
  const screenIds = new Set(data.items.map(i => i.id));

  const removed = existingRows.filter(
    r => !screenIds.has(r.id) && r.category !== "conferencia" && r.category !== EXCLUDED_CATEGORY
  );
  if (removed.length > 0) {
    await supabase.from("purchase_items").delete().in("id", removed.map(r => r.id));
  }

  for (const i of data.items) {
    const payload = {
      item_type: i.itemType,
      quantity: i.quantity ?? null,
      total_value: i.totalValue ?? null,
      weight: i.weight ?? null,
      calc_input: (i.input as any) || null,
      calc_result: (i.result as any) || null,
      category: i.category || null,
      catalog_part_id: i.catalogPartId || null,
      seq: i.seq ?? null,
    };
    if (existingIds.has(i.id)) {
      await supabase.from("purchase_items").update(payload).eq("id", i.id);
    } else {
      await supabase.from("purchase_items").insert({ purchase_id: id, ...payload });
    }
  }

  // Total = soma de todos os itens realmente gravados (sem dupla contagem)
  const { data: allItems } = await supabase
    .from("purchase_items")
    .select("total_value, calc_result, category")
    .eq("purchase_id", id);
  const totalBrl = (allItems || [])
    .filter(i => i.category !== EXCLUDED_CATEGORY)
    .reduce((sum, i) => {
      const calc = i.calc_result as any;
      return sum + (Number(calc?.finalValueBrl) || Number(i.total_value) || 0);
    }, 0);

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

/** Add a single item to an existing purchase and recalculate total */
export async function addItemToPurchase(purchaseId: string, item: {
  catalogPartId?: string | null;
  itemType: PurchaseItemType;
  quantity: number;
  totalValue: number;
  weight?: number;
  category?: string | null;
}): Promise<boolean> {
  const { error } = await supabase.from("purchase_items").insert({
    purchase_id: purchaseId,
    item_type: item.itemType,
    quantity: item.quantity,
    total_value: item.totalValue,
    weight: item.weight || null,
    catalog_part_id: item.catalogPartId || null,
    category: item.category || null,
  });
  if (error) return false;

  // Recalculate total
  const { data: allItems } = await supabase.from("purchase_items").select("total_value").eq("purchase_id", purchaseId);
  const newTotal = (allItems || []).reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
  await supabase.from("purchases").update({ total_brl: newTotal }).eq("id", purchaseId);
  return true;
}

/** Remove item from purchase and recalculate total */
export async function removeItemFromPurchase(purchaseId: string, itemId: string): Promise<boolean> {
  const { error } = await supabase.from("purchase_items").delete().eq("id", itemId);
  if (error) return false;

  const { data: allItems } = await supabase.from("purchase_items").select("total_value").eq("purchase_id", purchaseId);
  const newTotal = (allItems || []).reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
  await supabase.from("purchases").update({ total_brl: newTotal }).eq("id", purchaseId);
  return true;
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

// ===== Reamostragem / Reanálise (após contestação) =====

export interface ContestInfo {
  motivo: string;
  date: string;
  destino: string;
}

/**
 * Returns contest info when the purchase is currently walking back through the
 * flow after a contested demonstrativo (reamostragem/reanálise). Returns null
 * once the process reaches the approval stage again.
 */
export function getContestInfo(purchase: Purchase): ContestInfo | null {
  const hist = (purchase.statusHistory || []) as { status: string; date: string; note?: string }[];
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    const note = h.note || "";
    if (note.startsWith("Contestado:")) {
      const body = note.replace(/^Contestado:\s*/, "");
      const motivo = body.split("→")[0].trim();
      return { motivo, date: h.date, destino: h.status };
    }
    const s = h.status || "";
    // Reached the approval stage (or later) without a pending contest → not in reanalysis
    if (
      s.includes("Gerar Boleto de Aprovação") ||
      s.includes("Aprovado") ||
      s === "Aprovação do Fornecedor" ||
      s.includes("Encerrado") ||
      s === "Concluído"
    ) {
      return null;
    }
  }
  return null;
}

export function isInReanalysis(purchase: Purchase): boolean {
  return getContestInfo(purchase) !== null;
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

/** Batch update item pricing (for sacola pricing panel) */
export async function batchUpdateItemPricing(
  purchaseId: string,
  updates: { itemId: string; totalValue: number; pricingSource: "catalogo" | "calculadora" }[]
): Promise<void> {
  // Update each item
  for (const u of updates) {
    await supabase
      .from("purchase_items")
      .update({ total_value: u.totalValue, pricing_source: u.pricingSource })
      .eq("id", u.itemId);
  }

  // Recalculate purchase total from ALL items with values
  const { data: allItems } = await supabase
    .from("purchase_items")
    .select("total_value, category")
    .eq("purchase_id", purchaseId);

  // For sacola purchases: conference items now have values, original sacola items don't
  const newTotal = (allItems || []).reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
  await supabase.from("purchases").update({ total_brl: newTotal }).eq("id", purchaseId);
}

/** Check if a purchase is fully closed */
export function isPurchaseClosed(purchase: Purchase): boolean {
  return purchase.status === "Concluído" || purchase.status === "Peças: Encerrado" || purchase.status === "Cerâmico: Encerrado" || purchase.status === "Exportação/Venda";
}

/** Check if a purchase is in the parallel bag-allocation phase (fora do quadro de processos) */
export function isInParallelPhase(purchase: Purchase): boolean {
  if (purchase.status === "Cerâmico: Aprovado" && purchase.opStatus != null) return true;
  if (purchase.status === "Peças: Alocado ao Bag") return true;
  return false;
}

/**
 * Peso real por item de conferência, considerando o peso após trituração (peças).
 * Retorna um mapa purchaseItemId -> peso real (rateado proporcionalmente ao peso
 * de catálogo). Itens de compras sem evidência de trituração ficam de fora.
 */
export async function getRealWeightsByItem(purchaseIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (purchaseIds.length === 0) return map;

  const { data: evidence } = await supabase
    .from("stage_evidence")
    .select("purchase_id, value_numeric, created_at")
    .eq("task_key", "weight_pos_trituracao")
    .in("purchase_id", purchaseIds)
    .order("created_at", { ascending: true });

  const tritByPurchase = new Map<string, number>();
  (evidence || []).forEach((e: any) => {
    const v = Number(e.value_numeric) || 0;
    if (v > 0) tritByPurchase.set(e.purchase_id, v);
  });
  if (tritByPurchase.size === 0) return map;

  const ids = [...tritByPurchase.keys()];
  const { data: items } = await supabase
    .from("purchase_items")
    .select("id, purchase_id, weight")
    .eq("category", "conferencia")
    .in("purchase_id", ids);

  const grouped = new Map<string, { id: string; weight: number }[]>();
  (items || []).forEach((i: any) => {
    const list = grouped.get(i.purchase_id) || [];
    list.push({ id: i.id, weight: Number(i.weight) || 0 });
    grouped.set(i.purchase_id, list);
  });

  grouped.forEach((list, pid) => {
    const trit = tritByPurchase.get(pid) || 0;
    const totalCatalog = list.reduce((s, i) => s + i.weight, 0);
    list.forEach((i, idx) => {
      const real = totalCatalog > 0
        ? (i.weight / totalCatalog) * trit
        : (idx === 0 ? trit : 0);
      map.set(i.id, real);
    });
  });

  return map;
}


/** Update the Boleto Syge / ERP number on a purchase */
export async function updatePurchaseErp(id: string, erpNumber: string): Promise<boolean> {
  const trimmed = erpNumber.trim();
  if (!trimmed) return false;
  const { error } = await supabase.from("purchases").update({ erp_number: trimmed }).eq("id", id);
  return !error;
}
