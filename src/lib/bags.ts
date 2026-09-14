import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/db";

// ===== Types =====

export type BagStatus = "Aberto" | "Fechado" | "Exportado";
export type BagMaterialType = "super" | "pecas" | "medio" | "diesel" | "cliente";

export interface Bag {
  id: string;
  bagNumber: string;
  bagLabel: string;
  status: BagStatus;
  materialType: BagMaterialType;
  buyer: string;
  totalWeight: number;
  maxWeight: number;
  totalPaidBrl: number;
  refinerPtPpm: number | null;
  refinerPdPpm: number | null;
  refinerRhPpm: number | null;
  refinerTotalValue: number | null;
  provisionalPtPpm: number | null;
  provisionalPdPpm: number | null;
  provisionalRhPpm: number | null;
  notes: string;
  createdAt: string;
  closedAt: string | null;
}

export interface BagItem {
  id: string;
  bagId: string;
  purchaseId: string;
  purchaseItemId: string;
  weight: number;
  paidValue: number;
  estimatedPtPpm: number;
  estimatedPdPpm: number;
  estimatedRhPpm: number;
  supplierName: string;
  allocatedAt: string;
}

// ===== Constants =====

export const BRANCHES_WITH_OWN_BAG: Record<string, BagMaterialType[]> = {
  "Bahia": ["medio"],
  "Minas Gerais": ["pecas", "medio"],
  "Rio de Janeiro": ["medio"],
};

export const BRANCHES_WITHOUT_OWN_BAG = [
  "Jaboatão dos Guararapes", "Fortaleza", "Teresina", "Goiânia",
  "Ribeirão Preto", "Curitiba", "Portão", "Palhoça",
  "Manaus", "Belém", "Ibiporã",
];

export const SUPER_BUYERS = ["TV", "Marcos"];

export const WEIGHT_LIMIT = 1000;
export const WEIGHT_WARNING_MARGIN = 0.05; // 5%

// ===== CRUD =====

function mapRow(r: any): Bag {
  return {
    id: r.id,
    bagNumber: r.bag_number,
    bagLabel: r.bag_label || "",
    status: r.status as BagStatus,
    materialType: r.material_type as BagMaterialType,
    buyer: r.buyer || "",
    totalWeight: Number(r.total_weight) || 0,
    maxWeight: Number(r.max_weight) || 1000,
    totalPaidBrl: Number(r.total_paid_brl) || 0,
    refinerPtPpm: r.refiner_pt_ppm != null ? Number(r.refiner_pt_ppm) : null,
    refinerPdPpm: r.refiner_pd_ppm != null ? Number(r.refiner_pd_ppm) : null,
    refinerRhPpm: r.refiner_rh_ppm != null ? Number(r.refiner_rh_ppm) : null,
    refinerTotalValue: r.refiner_total_value != null ? Number(r.refiner_total_value) : null,
    provisionalPtPpm: r.provisional_pt_ppm != null ? Number(r.provisional_pt_ppm) : null,
    provisionalPdPpm: r.provisional_pd_ppm != null ? Number(r.provisional_pd_ppm) : null,
    provisionalRhPpm: r.provisional_rh_ppm != null ? Number(r.provisional_rh_ppm) : null,
    notes: r.notes || "",
    createdAt: r.created_at,
    closedAt: r.closed_at,
  };
}

function mapItemRow(r: any): BagItem {
  return {
    id: r.id,
    bagId: r.bag_id,
    purchaseId: r.purchase_id,
    purchaseItemId: r.purchase_item_id || "",
    weight: Number(r.weight) || 0,
    paidValue: Number(r.paid_value) || 0,
    estimatedPtPpm: Number(r.estimated_pt_ppm) || 0,
    estimatedPdPpm: Number(r.estimated_pd_ppm) || 0,
    estimatedRhPpm: Number(r.estimated_rh_ppm) || 0,
    supplierName: r.supplier_name || "",
    allocatedAt: r.allocated_at,
  };
}

export async function loadBags(): Promise<Bag[]> {
  const data = await fetchAllRows<any>(() =>
    supabase.from("bags").select("*").order("created_at", { ascending: false }) as any
  ).catch(() => [] as any[]);
  return data.map(mapRow);
}

export async function loadBagItems(bagId: string): Promise<BagItem[]> {
  const data = await fetchAllRows<any>(() =>
    supabase
      .from("bag_items")
      .select("*")
      .eq("bag_id", bagId)
      .order("allocated_at", { ascending: true }) as any
  ).catch(() => [] as any[]);
  return data.map(mapItemRow);
}

export async function createBag(input: {
  bagLabel: string;
  materialType: BagMaterialType;
  buyer: string;
  maxWeight?: number;
  notes?: string;
}): Promise<Bag | null> {
  const { data: numData } = await supabase.rpc("generate_bag_number");
  const bagNumber = numData || `BAG-${Date.now()}`;

  const { data, error } = await supabase
    .from("bags")
    .insert({
      bag_number: bagNumber,
      bag_label: input.bagLabel,
      material_type: input.materialType,
      buyer: input.buyer,
      max_weight: input.maxWeight || WEIGHT_LIMIT,
      notes: input.notes || "",
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function updateBagStatus(id: string, status: BagStatus) {
  const update: any = { status };
  if (status === "Fechado" || status === "Exportado") {
    update.closed_at = new Date().toISOString();
  }
  await supabase.from("bags").update(update).eq("id", id);
}

export async function updateBagAnalysis(id: string, data: {
  provisionalPtPpm?: number | null;
  provisionalPdPpm?: number | null;
  provisionalRhPpm?: number | null;
  refinerPtPpm?: number | null;
  refinerPdPpm?: number | null;
  refinerRhPpm?: number | null;
  refinerTotalValue?: number | null;
}) {
  await supabase.from("bags").update({
    provisional_pt_ppm: data.provisionalPtPpm,
    provisional_pd_ppm: data.provisionalPdPpm,
    provisional_rh_ppm: data.provisionalRhPpm,
    refiner_pt_ppm: data.refinerPtPpm,
    refiner_pd_ppm: data.refinerPdPpm,
    refiner_rh_ppm: data.refinerRhPpm,
    refiner_total_value: data.refinerTotalValue,
  }).eq("id", id);
}

/**
 * Exclui um bag devolvendo os itens para a alocação.
 * Bags fechados ou exportados não podem ser excluídos.
 */
export async function deleteBag(id: string): Promise<string | null> {
  const { data: bag } = await supabase
    .from("bags")
    .select("id, bag_number, status")
    .eq("id", id)
    .single();
  if (!bag) return "Bag não encontrado.";
  if (bag.status !== "Aberto") {
    return "Somente bags com status Aberto podem ser excluídos.";
  }

  const items = await loadBagItems(id);
  for (const item of items) {
    await logBagItemMovement(item, bag.bag_number || "", "bag_deleted");
    await reopenForAllocation(item.purchaseId);
  }

  await supabase.from("bags").delete().eq("id", id);
  return null;
}

// ===== Allocation =====

export async function allocateItem(input: {
  bagId: string;
  purchaseId: string;
  purchaseItemId: string;
  weight: number;
  paidValue: number;
  estimatedPtPpm: number;
  estimatedPdPpm: number;
  estimatedRhPpm: number;
  supplierName: string;
}): Promise<BagItem | null> {
  const { data, error } = await supabase
    .from("bag_items")
    .insert({
      bag_id: input.bagId,
      purchase_id: input.purchaseId,
      purchase_item_id: input.purchaseItemId,
      weight: input.weight,
      paid_value: input.paidValue,
      estimated_pt_ppm: input.estimatedPtPpm,
      estimated_pd_ppm: input.estimatedPdPpm,
      estimated_rh_ppm: input.estimatedRhPpm,
      supplier_name: input.supplierName,
    })
    .select()
    .single();

  if (error || !data) return null;

  // Update bag totals
  await recalcBagTotals(input.bagId);

  return mapItemRow(data);
}

/**
 * Remove um item do bag: registra o histórico, apaga a alocação, recalcula os
 * totais e devolve a compra para a fase de alocação.
 */
export async function removeAllocation(itemId: string, bagId: string) {
  const { data: row } = await supabase
    .from("bag_items")
    .select("*")
    .eq("id", itemId)
    .single();

  let bagNumber = "";
  if (row) {
    const { data: bag } = await supabase.from("bags").select("bag_number").eq("id", bagId).single();
    bagNumber = bag?.bag_number || "";
    await logBagItemMovement(mapItemRow(row), bagNumber, "removed");
  }

  await supabase.from("bag_items").delete().eq("id", itemId);
  await recalcBagTotals(bagId);

  if (row) await reopenForAllocation(row.purchase_id);
}

async function recalcBagTotals(bagId: string) {
  const { data: items } = await supabase
    .from("bag_items")
    .select("weight, paid_value")
    .eq("bag_id", bagId);

  const totalWeight = (items || []).reduce((s, i: any) => s + Number(i.weight || 0), 0);
  const totalPaid = (items || []).reduce((s, i: any) => s + Number(i.paid_value || 0), 0);

  await supabase.from("bags").update({
    total_weight: totalWeight,
    total_paid_brl: totalPaid,
  }).eq("id", bagId);
}

// ===== Histórico de movimentações =====

export type BagMovementAction = "removed" | "bag_deleted";

export interface BagItemMovement {
  id: string;
  bagId: string | null;
  bagNumber: string;
  purchaseId: string | null;
  purchaseNumber: string;
  purchaseItemId: string;
  weight: number;
  paidValue: number;
  supplierName: string;
  action: BagMovementAction;
  createdAt: string;
}

/** Grava no histórico a saída de um item do bag. */
async function logBagItemMovement(item: BagItem, bagNumber: string, action: BagMovementAction) {
  const { data: purchase } = await supabase
    .from("purchases")
    .select("purchase_number")
    .eq("id", item.purchaseId)
    .single();

  const { data: auth } = await supabase.auth.getUser();

  await supabase.from("bag_item_history").insert({
    bag_id: item.bagId,
    bag_number: bagNumber,
    purchase_id: item.purchaseId,
    purchase_number: purchase?.purchase_number || "",
    purchase_item_id: item.purchaseItemId,
    weight: item.weight,
    paid_value: item.paidValue,
    supplier_name: item.supplierName,
    action,
    created_by: auth?.user?.id || null,
  });
}

export async function loadBagItemHistory(bagId?: string): Promise<BagItemMovement[]> {
  const data = await fetchAllRows<any>(() => {
    let q = supabase.from("bag_item_history").select("*").order("created_at", { ascending: false });
    if (bagId) q = q.eq("bag_id", bagId);
    return q as any;
  }).catch(() => [] as any[]);

  return data.map((r: any) => ({
    id: r.id,
    bagId: r.bag_id,
    bagNumber: r.bag_number || "",
    purchaseId: r.purchase_id,
    purchaseNumber: r.purchase_number || "",
    purchaseItemId: r.purchase_item_id || "",
    weight: Number(r.weight) || 0,
    paidValue: Number(r.paid_value) || 0,
    supplierName: r.supplier_name || "",
    action: (r.action as BagMovementAction) || "removed",
    createdAt: r.created_at,
  }));
}

/**
 * Devolve a compra para a fase de alocação quando ela já havia sido encerrada,
 * registrando a reabertura no histórico de status.
 */
export async function reopenForAllocation(purchaseId: string): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, status, op_status, material_flow, status_history")
    .eq("id", purchaseId)
    .single();
  if (!purchase) return false;

  const flow = purchase.material_flow;
  const isCeramico = flow === "ceramico";
  const isPecas = flow === "pecas" || flow === "sacola";
  if (!isCeramico && !isPecas) return false;

  const targetStatus = isCeramico ? "Cerâmico: Aprovado" : "Peças: Alocado ao Bag";
  const alreadyOpen = isCeramico
    ? purchase.status === targetStatus && purchase.op_status === "Alocando Bag"
    : purchase.status === targetStatus;
  if (alreadyOpen) return false;

  const history = [
    ...((purchase.status_history as any[]) || []),
    { status: `${targetStatus} (reaberto: material retirado do bag)`, date: new Date().toISOString() },
  ];

  const update: any = { status: targetStatus, status_history: history };
  if (isCeramico) update.op_status = "Alocando Bag";

  const { error } = await supabase.from("purchases").update(update).eq("id", purchaseId);
  return !error;
}

// ===== Transfer =====

export async function updateTransferStatus(purchaseId: string, status: "pendente" | "em_transito" | "recebido") {
  const update: any = { transfer_status: status };
  if (status === "recebido") {
    update.location = "matriz";
  }
  await supabase.from("purchases").update(update).eq("id", purchaseId);
}

// ===== Helpers =====

export function getWeightPercentage(bag: Bag): number {
  return bag.maxWeight > 0 ? (bag.totalWeight / bag.maxWeight) * 100 : 0;
}

export function isOverWeight(bag: Bag, additionalWeight: number = 0): boolean {
  return (bag.totalWeight + additionalWeight) > bag.maxWeight * (1 + WEIGHT_WARNING_MARGIN);
}

export function isNearLimit(bag: Bag, additionalWeight: number = 0): boolean {
  const total = bag.totalWeight + additionalWeight;
  return total > bag.maxWeight && total <= bag.maxWeight * (1 + WEIGHT_WARNING_MARGIN);
}

export function getMaterialTypeLabel(type: BagMaterialType): string {
  const labels: Record<BagMaterialType, string> = {
    super: "Super",
    pecas: "Peças",
    medio: "Médio",
    diesel: "Diesel",
    cliente: "Cliente",
  };
  return labels[type] || type;
}

export function getStatusColor(status: BagStatus): string {
  switch (status) {
    case "Aberto": return "bg-green-100 text-green-800";
    case "Fechado": return "bg-yellow-100 text-yellow-800";
    case "Exportado": return "bg-blue-100 text-blue-800";
    default: return "bg-muted text-muted-foreground";
  }
}
