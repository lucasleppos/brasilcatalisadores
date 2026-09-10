import { calculate, CalculatorInput } from "./calculator";
import { Settings } from "./settings";

/** Valores padrão do material de referência (usados quando não configurados) */
export const REFERENCE_WEIGHT_KG = 1;
export const REFERENCE_PT_PPM = 200;
export const REFERENCE_PD_PPM = 1180;
export const REFERENCE_RH_PPM = 180;
/** Margem aplicada na referência e no material comparado */
export const REFERENCE_DISCOUNT_PCT = 15;

function refWeight(settings: Settings): number {
  const w = Number(settings.referenceWeightKg);
  return Number.isFinite(w) && w > 0 ? w : REFERENCE_WEIGHT_KG;
}

function refMargin(settings: Settings): number {
  const m = Number(settings.referenceMarginPct);
  return Number.isFinite(m) ? m : REFERENCE_DISCOUNT_PCT;
}

function valuePerKg(ptPpm: number, pdPpm: number, rhPpm: number, settings: Settings): number {
  const weight = refWeight(settings);
  const input: CalculatorInput = {
    grossWeight: weight,
    tare: 0,
    materialType: "comum",
    ptPpm,
    pdPpm,
    rhPpm,
    clientDiscount: refMargin(settings),
    entryType: "grupo",
    manualPrice: null,
    customPt: null,
    customPd: null,
    customRh: null,
  };
  const total = calculate(input, settings).finalValueBrl;
  return total / weight;
}

/** Valor por kg do material de referência (R$/kg), com as cotações vigentes */
export function referenceValuePerKg(settings: Settings): number {
  return valuePerKg(
    Number(settings.referencePtPpm) || 0,
    Number(settings.referencePdPpm) || 0,
    Number(settings.referenceRhPpm) || 0,
    settings
  );
}

/** Valor de 1 kg do material analisado (R$/kg) */
export function materialValuePerKg(
  ptPpm: number,
  pdPpm: number,
  rhPpm: number,
  settings: Settings
): number {
  return valuePerKg(ptPpm || 0, pdPpm || 0, rhPpm || 0, settings);
}

/**
 * Índice do material em relação à referência, em %.
 * Retorna null quando não há análise (todos os PPMs zerados) ou a referência é inválida.
 */
export function allocationPercent(
  ptPpm: number,
  pdPpm: number,
  rhPpm: number,
  settings: Settings,
  reference?: number
): number | null {
  const pt = ptPpm || 0;
  const pd = pdPpm || 0;
  const rh = rhPpm || 0;
  if (pt <= 0 && pd <= 0 && rh <= 0) return null;
  const ref = reference ?? referenceValuePerKg(settings);
  if (!Number.isFinite(ref) || ref <= 0) return null;
  const value = materialValuePerKg(pt, pd, rh, settings);
  if (!Number.isFinite(value)) return null;
  return (value / ref) * 100;
}
