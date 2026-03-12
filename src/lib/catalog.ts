import { supabase } from "@/integrations/supabase/client";

// ===== Types =====

export interface CatalogGroup {
  id: string;
  name: string;
  margin: number;
  createdAt: string;
}

export interface CatalogPart {
  id: string;
  code: string;
  reference: string;
  brand: string;
  vehicle: string;
  weight: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  groupId: string | null;
  groupName?: string;
  groupMargin?: number;
  createdAt: string;
}

// ===== Groups CRUD =====

export async function loadGroups(): Promise<CatalogGroup[]> {
  const { data, error } = await supabase
    .from("catalog_groups")
    .select("*")
    .order("name");

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    margin: Number(r.margin),
    createdAt: r.created_at,
  }));
}

export async function createGroup(name: string, margin: number): Promise<CatalogGroup | null> {
  const { data, error } = await supabase
    .from("catalog_groups")
    .insert({ name, margin })
    .select()
    .single();

  if (error || !data) return null;
  return { id: data.id, name: data.name, margin: Number(data.margin), createdAt: data.created_at };
}

export async function updateGroup(id: string, name: string, margin: number): Promise<boolean> {
  const { error } = await supabase
    .from("catalog_groups")
    .update({ name, margin })
    .eq("id", id);
  return !error;
}

export async function deleteGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from("catalog_groups").delete().eq("id", id);
  return !error;
}

// ===== Parts CRUD =====

export async function loadParts(): Promise<CatalogPart[]> {
  const { data, error } = await supabase
    .from("catalog_parts")
    .select("*, catalog_groups(name, margin)")
    .order("brand");

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    code: r.code,
    reference: r.reference,
    brand: r.brand,
    vehicle: r.vehicle,
    weight: Number(r.weight),
    ptPpm: Number(r.pt_ppm),
    pdPpm: Number(r.pd_ppm),
    rhPpm: Number(r.rh_ppm),
    groupId: r.group_id,
    groupName: r.catalog_groups?.name,
    groupMargin: r.catalog_groups ? Number(r.catalog_groups.margin) : undefined,
    createdAt: r.created_at,
  }));
}

export async function searchParts(query: string): Promise<CatalogPart[]> {
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from("catalog_parts")
    .select("*, catalog_groups(name, margin)")
    .or(`code.ilike.${q},reference.ilike.${q},brand.ilike.${q},vehicle.ilike.${q}`)
    .limit(20);

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    code: r.code,
    reference: r.reference,
    brand: r.brand,
    vehicle: r.vehicle,
    weight: Number(r.weight),
    ptPpm: Number(r.pt_ppm),
    pdPpm: Number(r.pd_ppm),
    rhPpm: Number(r.rh_ppm),
    groupId: r.group_id,
    groupName: r.catalog_groups?.name,
    groupMargin: r.catalog_groups ? Number(r.catalog_groups.margin) : undefined,
    createdAt: r.created_at,
  }));
}

export async function createPart(part: Omit<CatalogPart, "id" | "createdAt" | "groupName" | "groupMargin">): Promise<boolean> {
  const { error } = await supabase.from("catalog_parts").insert({
    code: part.code,
    reference: part.reference,
    brand: part.brand,
    vehicle: part.vehicle,
    weight: part.weight,
    pt_ppm: part.ptPpm,
    pd_ppm: part.pdPpm,
    rh_ppm: part.rhPpm,
    group_id: part.groupId,
  });
  return !error;
}

export async function updatePart(id: string, part: Partial<Omit<CatalogPart, "id" | "createdAt" | "groupName" | "groupMargin">>): Promise<boolean> {
  const update: any = {};
  if (part.code !== undefined) update.code = part.code;
  if (part.reference !== undefined) update.reference = part.reference;
  if (part.brand !== undefined) update.brand = part.brand;
  if (part.vehicle !== undefined) update.vehicle = part.vehicle;
  if (part.weight !== undefined) update.weight = part.weight;
  if (part.ptPpm !== undefined) update.pt_ppm = part.ptPpm;
  if (part.pdPpm !== undefined) update.pd_ppm = part.pdPpm;
  if (part.rhPpm !== undefined) update.rh_ppm = part.rhPpm;
  if (part.groupId !== undefined) update.group_id = part.groupId;

  const { error } = await supabase.from("catalog_parts").update(update).eq("id", id);
  return !error;
}

export async function deletePart(id: string): Promise<boolean> {
  const { error } = await supabase.from("catalog_parts").delete().eq("id", id);
  return !error;
}

export async function bulkImportParts(
  parts: Omit<CatalogPart, "id" | "createdAt" | "groupName" | "groupMargin">[],
): Promise<number> {
  const rows = parts.map((p) => ({
    code: p.code,
    reference: p.reference,
    brand: p.brand,
    vehicle: p.vehicle,
    weight: p.weight,
    pt_ppm: p.ptPpm,
    pd_ppm: p.pdPpm,
    rh_ppm: p.rhPpm,
    group_id: p.groupId,
  }));

  const { data, error } = await supabase.from("catalog_parts").insert(rows).select("id");
  if (error) return 0;
  return data?.length ?? 0;
}
