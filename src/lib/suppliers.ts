import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  name: string;
  document: string;
  email: string;
  branch: string;
  buyer: string;
  /** Legado — mantido para compatibilidade */
  margin: number;
  /** Margem aplicada nos fluxos de Peça / Peça em Sacola (%) */
  marginPecas: number;
  /** Margem aplicada no fluxo Cerâmico (%) */
  marginCeramico: number;
  createdAt: string;
}

const mapRow = (r: any): Supplier => ({
  id: r.id,
  name: r.name,
  document: r.document,
  email: r.email,
  branch: r.branch,
  buyer: r.buyer,
  margin: Number(r.margin),
  marginPecas: Number(r.margin_pecas ?? r.margin ?? 15),
  marginCeramico: Number(r.margin_ceramico ?? r.margin ?? 15),
  createdAt: r.created_at,
});

export async function loadSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
}

export async function addSupplier(data: Omit<Supplier, "id" | "createdAt">): Promise<Supplier | null> {
  const { data: row, error } = await supabase
    .from("suppliers")
    .insert({
      name: data.name,
      document: data.document,
      email: data.email,
      branch: data.branch,
      buyer: data.buyer,
      margin: data.marginPecas ?? data.margin,
      margin_pecas: data.marginPecas ?? data.margin,
      margin_ceramico: data.marginCeramico ?? data.margin,
    })
    .select()
    .single();

  if (error || !row) return null;
  return mapRow(row);
}

export async function updateSupplier(id: string, data: Partial<Omit<Supplier, "id" | "createdAt">>): Promise<Supplier | null> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.document !== undefined) updateData.document = data.document;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.branch !== undefined) updateData.branch = data.branch;
  if (data.buyer !== undefined) updateData.buyer = data.buyer;
  if (data.marginPecas !== undefined) {
    updateData.margin_pecas = data.marginPecas;
    updateData.margin = data.marginPecas;
  }
  if (data.marginCeramico !== undefined) updateData.margin_ceramico = data.marginCeramico;

  const { data: row, error } = await supabase
    .from("suppliers")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !row) return null;
  return mapRow(row);
}

export async function deleteSupplier(id: string) {
  await supabase.from("suppliers").delete().eq("id", id);
}

export async function importSuppliers(rows: Omit<Supplier, "id" | "createdAt">[]): Promise<number> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(
      rows.map((r) => ({
        name: r.name,
        document: r.document,
        email: r.email,
        branch: r.branch,
        buyer: r.buyer,
        margin: r.marginPecas ?? r.margin,
        margin_pecas: r.marginPecas ?? r.margin,
        margin_ceramico: r.marginCeramico ?? r.margin,
      }))
    )
    .select();

  if (error || !data) return 0;
  return data.length;
}
