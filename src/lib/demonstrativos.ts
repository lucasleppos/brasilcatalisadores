import { supabase } from "@/integrations/supabase/client";

export interface Demonstrativo {
  id: string;
  purchaseId: string;
  versao: number;
  status: "pendente" | "aprovado" | "contestado";
  valorTotal: number;
  enviadoEm: string;
  respondidoEm: string | null;
  motivoContestacao: string | null;
  createdBy: string | null;
}

function mapRow(r: any): Demonstrativo {
  return {
    id: r.id,
    purchaseId: r.purchase_id,
    versao: r.versao,
    status: r.status,
    valorTotal: Number(r.valor_total) || 0,
    enviadoEm: r.enviado_em,
    respondidoEm: r.respondido_em,
    motivoContestacao: r.motivo_contestacao,
    createdBy: r.created_by,
  };
}

export async function loadDemonstrativos(purchaseId: string): Promise<Demonstrativo[]> {
  const { data, error } = await supabase
    .from("demonstrativos")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("versao", { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createDemonstrativo(purchaseId: string, valorTotal: number, userId?: string): Promise<Demonstrativo | null> {
  // Get next version
  const { data: existing } = await supabase
    .from("demonstrativos")
    .select("versao")
    .eq("purchase_id", purchaseId)
    .order("versao", { ascending: false })
    .limit(1);

  const nextVersion = ((existing?.[0] as any)?.versao || 0) + 1;

  const { data, error } = await supabase
    .from("demonstrativos")
    .insert({
      purchase_id: purchaseId,
      versao: nextVersion,
      status: "pendente",
      valor_total: valorTotal,
      created_by: userId || null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function contestDemonstrativo(id: string, motivo: string): Promise<boolean> {
  const { error } = await supabase
    .from("demonstrativos")
    .update({
      status: "contestado",
      respondido_em: new Date().toISOString(),
      motivo_contestacao: motivo,
    })
    .eq("id", id);
  return !error;
}

export async function approveDemonstrativo(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("demonstrativos")
    .update({
      status: "aprovado",
      respondido_em: new Date().toISOString(),
    })
    .eq("id", id);
  return !error;
}

export async function generateDemonstrativoPdf(purchaseId: string, demonstrativoId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-demonstrativo-pdf", {
    body: { purchaseId, demonstrativoId },
  });

  if (error) throw new Error("Erro ao gerar PDF");

  // data is already a Blob when responseType is not set
  const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}
