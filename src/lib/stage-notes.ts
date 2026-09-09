import { supabase } from "@/integrations/supabase/client";

export const APPROVAL_NOTE_KEY = "aprovacao_obs";

/** Lê a observação mais recente da etapa (por chave). */
export async function loadStageNote(purchaseId: string, taskKey = APPROVAL_NOTE_KEY): Promise<string> {
  const { data, error } = await supabase
    .from("stage_evidence")
    .select("value_text")
    .eq("purchase_id", purchaseId)
    .eq("task_key", taskKey)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("Erro ao carregar observação:", error);
    return "";
  }
  return data?.[0]?.value_text ?? "";
}

/** Grava (ou atualiza) a observação da etapa. */
export async function saveStageNote(
  purchaseId: string,
  stage: string,
  text: string,
  taskKey = APPROVAL_NOTE_KEY
): Promise<boolean> {
  const { data: existing, error: selErr } = await supabase
    .from("stage_evidence")
    .select("id")
    .eq("purchase_id", purchaseId)
    .eq("task_key", taskKey)
    .order("created_at", { ascending: false })
    .limit(1);
  if (selErr) {
    console.error("Erro ao verificar observação:", selErr);
    return false;
  }

  if (existing?.[0]?.id) {
    const { error } = await supabase
      .from("stage_evidence")
      .update({ value_text: text, stage })
      .eq("id", existing[0].id);
    if (error) {
      console.error("Erro ao salvar observação:", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from("stage_evidence").insert({
    purchase_id: purchaseId,
    stage,
    task_key: taskKey,
    data_type: "text",
    value_text: text,
  });
  if (error) {
    console.error("Erro ao salvar observação:", error);
    return false;
  }
  return true;
}
