import { Settings } from "./settings";

export type EntryType = "peca_fechada" | "peca_sacola" | "grupo";
export type MaterialType = "comum" | "diesel" | "super";

export interface CalculatorInput {
  grossWeight: number; // kg
  tare: number; // kg
  materialType: MaterialType;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  clientDiscount: number; // %
  entryType: EntryType;
  manualPrice: number | null; // BRL, for peça fechada/sacola
  // custom quotes (null = use settings)
  customPt: number | null;
  customPd: number | null;
  customRh: number | null;
}

export interface CalculatorResult {
  netWeightKg: number;
  wetWeightLb: number;
  dryWeightLb: number;
  dryWeightG: number;
  ptContentG: number;
  pdContentG: number;
  rhContentG: number;
  ptPayableG: number;
  pdPayableG: number;
  rhPayableG: number;
  ptTroyOz: number;
  pdTroyOz: number;
  rhTroyOz: number;
  ptValueUsd: number;
  pdValueUsd: number;
  rhValueUsd: number;
  grossMetalValueUsd: number;
  treatmentDeduction: number;
  refiningPtDeduction: number;
  refiningPdDeduction: number;
  refiningRhDeduction: number;
  leasePtDeduction: number;
  leasePdDeduction: number;
  leaseRhDeduction: number;
  operationalDeduction: number;
  logisticDeduction: number;
  totalDeductions: number;
  netValueUsd: number;
  clientDiscountValue: number;
  finalValueUsd: number;
  finalValueBrl: number;
  manualPrice: number | null;
}

const KG_TO_LB = 2.20462;
const GRAMS_PER_TROY_OZ = 31.1035;
const GRAMS_PER_LB = 453.592;

export function calculate(input: CalculatorInput, settings: Settings): CalculatorResult {
  const ptPrice = input.customPt ?? settings.ptPrice;
  const pdPrice = input.customPd ?? settings.pdPrice;
  const rhPrice = input.customRh ?? settings.rhPrice;

  // Weight conversions
  const netWeightKg = Math.max(0, input.grossWeight - input.tare);
  const wetWeightLb = netWeightKg * KG_TO_LB;
  const moistureFactor = 1 - settings.moistureDiscount / 100;
  const dryWeightLb = wetWeightLb * moistureFactor;
  const dryWeightG = dryWeightLb * GRAMS_PER_LB;

  // Metal content (ppm = parts per million = g/ton = mg/kg → g = ppm * kg / 1000... actually ppm of dry weight in grams)
  // ppm means grams per metric ton. dryWeightG / 1_000_000 * ppm = grams
  const ptContentG = (input.ptPpm * dryWeightG) / 1_000_000;
  const pdContentG = (input.pdPpm * dryWeightG) / 1_000_000;
  const rhContentG = (input.rhPpm * dryWeightG) / 1_000_000;

  // Payable metal (recovery rates)
  const ptPayableG = ptContentG * (settings.recoveryPt / 100);
  const pdPayableG = pdContentG * (settings.recoveryPd / 100);
  const rhPayableG = rhContentG * (settings.recoveryRh / 100);

  // Troy oz
  const ptTroyOz = ptPayableG / GRAMS_PER_TROY_OZ;
  const pdTroyOz = pdPayableG / GRAMS_PER_TROY_OZ;
  const rhTroyOz = rhPayableG / GRAMS_PER_TROY_OZ;

  // Metal value USD
  const ptValueUsd = ptTroyOz * ptPrice;
  const pdValueUsd = pdTroyOz * pdPrice;
  const rhValueUsd = rhTroyOz * rhPrice;
  const grossMetalValueUsd = ptValueUsd + pdValueUsd + rhValueUsd;

  // Deductions
  const treatmentDeduction = wetWeightLb * settings.treatmentFee;
  const refiningPtDeduction = ptTroyOz * settings.refiningPt;
  const refiningPdDeduction = pdTroyOz * settings.refiningPd;
  const refiningRhDeduction = rhTroyOz * settings.refiningRh;

  const leaseMultiplier = (days: number, base: number) => days / base;
  const lm = leaseMultiplier(settings.leaseDays, settings.leaseBase);
  const leasePtDeduction = ptValueUsd * (settings.leasePt / 100) * lm;
  const leasePdDeduction = pdValueUsd * (settings.leasePd / 100) * lm;
  const leaseRhDeduction = rhValueUsd * (settings.leaseRh / 100) * lm;

  const operationalDeduction = netWeightKg * settings.operationalCost;
  const logisticDeduction = netWeightKg * settings.logisticCost;

  const totalDeductions =
    treatmentDeduction +
    refiningPtDeduction + refiningPdDeduction + refiningRhDeduction +
    leasePtDeduction + leasePdDeduction + leaseRhDeduction +
    operationalDeduction + logisticDeduction;

  const netValueUsd = grossMetalValueUsd - totalDeductions;
  const clientDiscountValue = netValueUsd * (input.clientDiscount / 100);
  const finalValueUsd = Math.max(0, netValueUsd - clientDiscountValue);
  const finalValueBrl = finalValueUsd * settings.usdToBrl;

  return {
    netWeightKg, wetWeightLb, dryWeightLb, dryWeightG,
    ptContentG, pdContentG, rhContentG,
    ptPayableG, pdPayableG, rhPayableG,
    ptTroyOz, pdTroyOz, rhTroyOz,
    ptValueUsd, pdValueUsd, rhValueUsd,
    grossMetalValueUsd,
    treatmentDeduction,
    refiningPtDeduction, refiningPdDeduction, refiningRhDeduction,
    leasePtDeduction, leasePdDeduction, leaseRhDeduction,
    operationalDeduction, logisticDeduction,
    totalDeductions,
    netValueUsd, clientDiscountValue,
    finalValueUsd, finalValueBrl,
    manualPrice: input.manualPrice,
  };
}

// History
export interface SimulationRecord {
  id: string;
  date: string;
  input: CalculatorInput;
  result: CalculatorResult;
}

const HISTORY_KEY = "catalisador-pro-history";

export function loadHistory(): SimulationRecord[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function saveToHistory(input: CalculatorInput, result: CalculatorResult) {
  const history = loadHistory();
  const record: SimulationRecord = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    input,
    result,
  };
  history.unshift(record);
  if (history.length > 20) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return record;
}
