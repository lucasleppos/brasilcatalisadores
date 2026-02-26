export interface Settings {
  // Metal quotes USD/ozt
  ptPrice: number;
  pdPrice: number;
  rhPrice: number;
  // Exchange rate
  usdToBrl: number;
  // Costs $/kg
  operationalCost: number;
  logisticCost: number;
  // Refining fees
  treatmentFee: number; // $/lb
  refiningPt: number; // $/ozt
  refiningPd: number; // $/ozt
  refiningRh: number; // $/ozt
  // Lease fees %
  leasePt: number;
  leasePd: number;
  leaseRh: number;
  leaseDays: number;
  leaseBase: number;
  // Recovery rates %
  recoveryPt: number;
  recoveryPd: number;
  recoveryRh: number;
  // Moisture discount %
  moistureDiscount: number;
}

export const defaultSettings: Settings = {
  ptPrice: 950,
  pdPrice: 950,
  rhPrice: 4500,
  usdToBrl: 5.0,
  operationalCost: 0.50,
  logisticCost: 0.30,
  treatmentFee: 1.50,
  refiningPt: 15,
  refiningPd: 15,
  refiningRh: 25,
  leasePt: 6,
  leasePd: 4,
  leaseRh: 6,
  leaseDays: 120,
  leaseBase: 360,
  recoveryPt: 97.5,
  recoveryPd: 97.5,
  recoveryRh: 92.5,
  moistureDiscount: 1,
};

const STORAGE_KEY = "catalisador-pro-settings";

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {}
  return { ...defaultSettings };
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
