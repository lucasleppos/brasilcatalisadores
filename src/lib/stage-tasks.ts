import { supabase } from "@/integrations/supabase/client";

// ===== Task Definitions per Stage =====

export interface TaskRequirement {
  key: string;
  type: "photo" | "weight" | "note" | "analysis";
  label: string;
  required: boolean;
  multi?: boolean;
}

export const STAGE_REQUIREMENTS: Record<string, TaskRequirement[]> = {
  // Conferência
  "Em Conferência": [
    { key: "photo_recebimento", type: "photo", label: "Foto do material recebido", required: true, multi: true },
    { key: "confirm_itens", type: "note", label: "Confirmar itens do pedido", required: true },
  ],
  // Cerâmico: Separação
  "Cerâmico: Em Separação": [
    { key: "photo_separacao", type: "photo", label: "Foto do material separado", required: true },
  ],
  // Peças: Corte
  "Peças: Em Corte": [
    { key: "photo_pos_corte", type: "photo", label: "Foto pós-corte", required: true },
    { key: "weight_ceramica_extraida", type: "weight", label: "Peso cerâmica extraída (kg)", required: true },
  ],
  // Peças: Trituração
  "Peças: Em Trituração": [
    { key: "weight_pos_trituracao", type: "weight", label: "Peso pós-trituração (kg)", required: true },
    { key: "photo_amostra", type: "photo", label: "Foto da amostra preparada", required: true },
  ],
  // Cerâmico: Trituração/Homogeneização
  "Cerâmico: Em Trituração/Homogeneização": [
    { key: "weight_pos_trituracao", type: "weight", label: "Peso pós-trituração (kg)", required: true },
    { key: "photo_amostra", type: "photo", label: "Foto da amostra preparada", required: true },
  ],
  // Lab analysis — handled by TripleAnalysisForm, not generic checklist
  "Cerâmico: Lab em Análise": [
    { key: "analysis_1", type: "analysis", label: "Análise 1 (Pt/Pd/Rh)", required: true },
    { key: "analysis_2", type: "analysis", label: "Análise 2 (Pt/Pd/Rh)", required: true },
    { key: "analysis_3", type: "analysis", label: "Análise 3 (Pt/Pd/Rh)", required: true },
  ],
  "Análise": [
    { key: "analysis_1", type: "analysis", label: "Análise 1 (Pt/Pd/Rh)", required: true },
    { key: "analysis_2", type: "analysis", label: "Análise 2 (Pt/Pd/Rh)", required: true },
    { key: "analysis_3", type: "analysis", label: "Análise 3 (Pt/Pd/Rh)", required: true },
  ],
  // Pagamento (optional photo)
  "Peças: Aprovado - Aguardando Pagamento": [
    { key: "photo_comprovante", type: "photo", label: "Comprovante de pagamento", required: false },
  ],
};

// ===== Evidence CRUD =====

export interface StageEvidence {
  id: string;
  purchaseId: string;
  stage: string;
  taskKey: string;
  dataType: string;
  valueNumeric: number | null;
  valueText: string | null;
  fileUrl: string | null;
  createdBy: string | null;
  createdAt: string;
}

function mapEvidence(r: any): StageEvidence {
  return {
    id: r.id,
    purchaseId: r.purchase_id,
    stage: r.stage,
    taskKey: r.task_key,
    dataType: r.data_type,
    valueNumeric: r.value_numeric != null ? Number(r.value_numeric) : null,
    valueText: r.value_text,
    fileUrl: r.file_url,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export async function loadEvidences(purchaseId: string): Promise<StageEvidence[]> {
  const { data, error } = await supabase
    .from("stage_evidence")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(mapEvidence);
}

export async function addEvidence(params: {
  purchaseId: string;
  stage: string;
  taskKey: string;
  dataType: string;
  valueNumeric?: number;
  valueText?: string;
  fileUrl?: string;
}): Promise<StageEvidence | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("stage_evidence")
    .insert({
      purchase_id: params.purchaseId,
      stage: params.stage,
      task_key: params.taskKey,
      data_type: params.dataType,
      value_numeric: params.valueNumeric ?? null,
      value_text: params.valueText ?? null,
      file_url: params.fileUrl ?? null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapEvidence(data);
}

export async function deleteEvidence(id: string): Promise<boolean> {
  const { error } = await supabase.from("stage_evidence").delete().eq("id", id);
  return !error;
}

// ===== Photo Upload =====

export async function uploadStagePhoto(
  purchaseId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${purchaseId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("stage-photos")
    .upload(path, file, { upsert: false });

  if (error) return null;

  const { data } = supabase.storage.from("stage-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ===== Lab Analyses CRUD =====

export interface LabAnalysis {
  id: string;
  purchaseId: string;
  labResultId: string | null;
  analysisNumber: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  createdBy: string | null;
  createdAt: string;
}

function mapAnalysis(r: any): LabAnalysis {
  return {
    id: r.id,
    purchaseId: r.purchase_id,
    labResultId: r.lab_result_id,
    analysisNumber: r.analysis_number,
    ptPpm: Number(r.pt_ppm) || 0,
    pdPpm: Number(r.pd_ppm) || 0,
    rhPpm: Number(r.rh_ppm) || 0,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export async function loadLabAnalyses(purchaseId: string): Promise<LabAnalysis[]> {
  const { data, error } = await supabase
    .from("lab_analyses")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("analysis_number", { ascending: true });
  if (error || !data) return [];
  return data.map(mapAnalysis);
}

export async function addLabAnalysis(params: {
  purchaseId: string;
  analysisNumber: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
}): Promise<LabAnalysis | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("lab_analyses")
    .insert({
      purchase_id: params.purchaseId,
      analysis_number: params.analysisNumber,
      pt_ppm: params.ptPpm,
      pd_ppm: params.pdPpm,
      rh_ppm: params.rhPpm,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapAnalysis(data);
}

// ===== Validation: can advance? =====

export function canAdvanceStage(
  status: string,
  evidences: StageEvidence[],
  labAnalyses: LabAnalysis[]
): { canAdvance: boolean; pending: TaskRequirement[] } {
  const reqs = STAGE_REQUIREMENTS[status] || [];
  if (reqs.length === 0) return { canAdvance: true, pending: [] };

  const pending: TaskRequirement[] = [];

  for (const req of reqs) {
    if (!req.required) continue;

    if (req.type === "analysis") {
      // Check lab_analyses
      const num = parseInt(req.key.replace("analysis_", ""));
      const found = labAnalyses.some(a => a.analysisNumber === num);
      if (!found) pending.push(req);
    } else {
      const found = evidences.some(e => e.taskKey === req.key);
      if (!found) pending.push(req);
    }
  }

  return { canAdvance: pending.length === 0, pending };
}

// ===== Analysis average + deviation =====

export function calcAnalysisAverage(analyses: LabAnalysis[]): {
  ptAvg: number; pdAvg: number; rhAvg: number;
  ptDev: number; pdDev: number; rhDev: number;
} | null {
  if (analyses.length < 3) return null;
  const pts = analyses.map(a => a.ptPpm);
  const pds = analyses.map(a => a.pdPpm);
  const rhs = analyses.map(a => a.rhPpm);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr: number[], mean: number) =>
    Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);

  const ptAvg = avg(pts);
  const pdAvg = avg(pds);
  const rhAvg = avg(rhs);

  return {
    ptAvg, pdAvg, rhAvg,
    ptDev: stdDev(pts, ptAvg),
    pdDev: stdDev(pds, pdAvg),
    rhDev: stdDev(rhs, rhAvg),
  };
}
