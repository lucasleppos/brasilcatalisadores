/**
 * Valor unitário das peças separadas do fluxo, calculado com os dados do
 * catálogo (peso e Pt/Pd/Rh) e a margem de peças do fornecedor — mesmo
 * cálculo usado na tela de Precificação de peças.
 */

import { supabase } from "@/integrations/supabase/client";
import { loadSettings } from "@/lib/settings";
import { calculate, CalculatorInput } from "@/lib/calculator";

export interface SeparatedValueInput {
  catalogPartId?: string | null;
  quantity?: number | null;
  /** peso já registrado do item (kg), opcional */
  weight?: number | null;
}

export interface SeparatedValueOutput {
  /** valor unitário em BRL, null quando não há dados de catálogo suficientes */
  unitValue: number | null;
}

/** Grupo pelo valor unitário: até 350 → 1, até 650 → 2, acima → 3. Sem valor → 1 */
export function groupForValue(v: number | null | undefined): 1 | 2 | 3 {
  if (v == null || !Number.isFinite(v) || v <= 0) return 1;
  if (v <= 350) return 1;
  if (v <= 650) return 2;
  return 3;
}

export async function computeSeparatedPieceValues(
  supplierId: string,
  pieces: SeparatedValueInput[],
): Promise<SeparatedValueOutput[]> {
  const partIds = Array.from(
    new Set(pieces.map(p => p.catalogPartId).filter(Boolean)),
  ) as string[];

  const [settings, supplierRes, partsRes] = await Promise.all([
    loadSettings(),
    supabase.from("suppliers").select("margin, margin_pecas").eq("id", supplierId).maybeSingle(),
    partIds.length
      ? supabase.from("catalog_parts").select("id, weight, pt_ppm, pd_ppm, rh_ppm").in("id", partIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const sup: any = supplierRes && "data" in supplierRes ? supplierRes.data : null;
  const marginPecas = Number(sup?.margin_pecas ?? sup?.margin) || 15;

  const cat: Record<string, { weight: number; ptPpm: number; pdPpm: number; rhPpm: number }> = {};
  (((partsRes as any).data || []) as any[]).forEach(p => {
    cat[p.id] = {
      weight: Number(p.weight) || 0,
      ptPpm: Number(p.pt_ppm) || 0,
      pdPpm: Number(p.pd_ppm) || 0,
      rhPpm: Number(p.rh_ppm) || 0,
    };
  });

  return pieces.map(piece => {
    const qty = piece.quantity && piece.quantity > 0 ? piece.quantity : 1;
    const info = piece.catalogPartId ? cat[piece.catalogPartId] : undefined;
    const grossWeight = (piece.weight || 0) > 0 ? piece.weight! : (info?.weight || 0) * qty;
    if (!info || grossWeight <= 0) return { unitValue: null };

    const input: CalculatorInput = {
      grossWeight,
      tare: 0,
      materialType: "comum",
      ptPpm: info.ptPpm,
      pdPpm: info.pdPpm,
      rhPpm: info.rhPpm,
      clientDiscount: marginPecas,
      entryType: "peca_fechada",
      manualPrice: null,
      customPt: null,
      customPd: null,
      customRh: null,
    };
    const result = calculate(input, settings);
    return { unitValue: result.finalValueBrl / qty };
  });
}
