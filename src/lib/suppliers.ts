import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  name: string;
  document: string;
  email: string;
  branch: string;
  buyer: string;
  margin: number;
  createdAt: string;
}

export async function loadSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    document: r.document,
    email: r.email,
    branch: r.branch,
    buyer: r.buyer,
    margin: Number(r.margin),
    createdAt: r.created_at,
  }));
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
      margin: data.margin,
    })
    .select()
    .single();

  if (error || !row) return null;

  return {
    id: row.id,
    name: row.name,
    document: row.document,
    email: row.email,
    branch: row.branch,
    buyer: row.buyer,
    margin: Number(row.margin),
    createdAt: row.created_at,
  };
}

export async function updateSupplier(id: string, data: Partial<Omit<Supplier, "id" | "createdAt">>): Promise<Supplier | null> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.document !== undefined) updateData.document = data.document;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.branch !== undefined) updateData.branch = data.branch;
  if (data.buyer !== undefined) updateData.buyer = data.buyer;
  if (data.margin !== undefined) updateData.margin = data.margin;

  const { data: row, error } = await supabase
    .from("suppliers")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !row) return null;

  return {
    id: row.id,
    name: row.name,
    document: row.document,
    email: row.email,
    branch: row.branch,
    buyer: row.buyer,
    margin: Number(row.margin),
    createdAt: row.created_at,
  };
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
        margin: r.margin,
      }))
    )
    .select();

  if (error || !data) return 0;
  return data.length;
}
