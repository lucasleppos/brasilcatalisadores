import { calculate, CalculatorInput } from "./calculator";
import { Settings } from "./settings";

/** PPMs do material de referência usado como base 100% */
export const REFERENCE_PT_PPM = 200;
export const REFERENCE_PD_PPM = 1180;
export const REFERENCE_RH_PPM = 180;
/** Desconto aplicado na referência e no material comparado */
export const REFERENCE_DISCOUNT_PCT = 15;

function valuePerKg(ptPpm: number, pdPpm: number, rhPpm: number, settings: Settings): number {
  const input: CalculatorInput = {
    grossWeight: 1,
    tare: 0,
    materialType: "comum",
    ptPpm,
    pdPpm,
    rhPpm,
    clientDiscount: REFERENCE_DISCOUNT_PCT,
    entryType: "grupo",
    manualPrice: null,
    customPt: null,
    customPd: null,
    customRh: null,
  };
  return calculate(input, settings).finalValueBrl;
}

/** Valor de 1 kg do material de referência (R$/kg), com as cotações vigentes */
export function referenceValuePerKg(settings: Settings): number {
  return valuePerKg(REFERENCE_PT_PPM, REFERENCE_PD_PPM, REFERENCE_RH_PPM, settings);
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
