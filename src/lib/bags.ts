import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("bags")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function loadBagItems(bagId: string): Promise<BagItem[]> {
  const { data, error } = await supabase
    .from("bag_items")
    .select("*")
    .eq("bag_id", bagId)
    .order("allocated_at", { ascending: true });
  if (error || !data) return [];
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

export async function deleteBag(id: string) {
  await supabase.from("bags").delete().eq("id", id);
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

export async function removeAllocation(itemId: string, bagId: string) {
  await supabase.from("bag_items").delete().eq("id", itemId);
  await recalcBagTotals(bagId);
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
