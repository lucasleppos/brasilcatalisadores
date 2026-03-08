import { supabase } from "@/integrations/supabase/client";

export interface LabResult {
  id: string;
  purchaseId: string;
  versao: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  createdBy: string | null;
  createdAt: string;
}

function mapRow(r: any): LabResult {
  return {
    id: r.id,
    purchaseId: r.purchase_id,
    versao: r.versao,
    ptPpm: Number(r.pt_ppm) || 0,
    pdPpm: Number(r.pd_ppm) || 0,
    rhPpm: Number(r.rh_ppm) || 0,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export async function loadLabResults(purchaseId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("versao", { ascending: true });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getLatestLabResult(purchaseId: string): Promise<LabResult | null> {
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("versao", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return mapRow(data[0]);
}
