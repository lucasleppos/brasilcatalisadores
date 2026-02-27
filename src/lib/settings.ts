import { supabase } from "@/integrations/supabase/client";

export interface Settings {
  ptPrice: number;
  pdPrice: number;
  rhPrice: number;
  usdToBrl: number;
  operationalCost: number;
  logisticCost: number;
  treatmentFee: number;
  refiningPt: number;
  refiningPd: number;
  refiningRh: number;
  leasePt: number;
  leasePd: number;
  leaseRh: number;
  leaseDays: number;
  leaseBase: number;
  recoveryPt: number;
  recoveryPd: number;
  recoveryRh: number;
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

function rowToSettings(r: any): Settings {
  return {
    ptPrice: Number(r.pt_price),
    pdPrice: Number(r.pd_price),
    rhPrice: Number(r.rh_price),
    usdToBrl: Number(r.usd_to_brl),
    operationalCost: Number(r.operational_cost),
    logisticCost: Number(r.logistic_cost),
    treatmentFee: Number(r.treatment_fee),
    refiningPt: Number(r.refining_pt),
    refiningPd: Number(r.refining_pd),
    refiningRh: Number(r.refining_rh),
    leasePt: Number(r.lease_pt),
    leasePd: Number(r.lease_pd),
    leaseRh: Number(r.lease_rh),
    leaseDays: Number(r.lease_days),
    leaseBase: Number(r.lease_base),
    recoveryPt: Number(r.recovery_pt),
    recoveryPd: Number(r.recovery_pd),
    recoveryRh: Number(r.recovery_rh),
    moistureDiscount: Number(r.moisture_discount),
  };
}

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) return { ...defaultSettings };
  return rowToSettings(data);
}

export async function saveSettings(settings: Settings): Promise<void> {
  // Get the single settings row id
  const { data: existing } = await supabase.from("settings").select("id").limit(1).single();

  if (!existing) {
    await supabase.from("settings").insert({
      pt_price: settings.ptPrice,
      pd_price: settings.pdPrice,
      rh_price: settings.rhPrice,
      usd_to_brl: settings.usdToBrl,
      operational_cost: settings.operationalCost,
      logistic_cost: settings.logisticCost,
      treatment_fee: settings.treatmentFee,
      refining_pt: settings.refiningPt,
      refining_pd: settings.refiningPd,
      refining_rh: settings.refiningRh,
      lease_pt: settings.leasePt,
      lease_pd: settings.leasePd,
      lease_rh: settings.leaseRh,
      lease_days: settings.leaseDays,
      lease_base: settings.leaseBase,
      recovery_pt: settings.recoveryPt,
      recovery_pd: settings.recoveryPd,
      recovery_rh: settings.recoveryRh,
      moisture_discount: settings.moistureDiscount,
    });
    return;
  }

  await supabase
    .from("settings")
    .update({
      pt_price: settings.ptPrice,
      pd_price: settings.pdPrice,
      rh_price: settings.rhPrice,
      usd_to_brl: settings.usdToBrl,
      operational_cost: settings.operationalCost,
      logistic_cost: settings.logisticCost,
      treatment_fee: settings.treatmentFee,
      refining_pt: settings.refiningPt,
      refining_pd: settings.refiningPd,
      refining_rh: settings.refiningRh,
      lease_pt: settings.leasePt,
      lease_pd: settings.leasePd,
      lease_rh: settings.leaseRh,
      lease_days: settings.leaseDays,
      lease_base: settings.leaseBase,
      recovery_pt: settings.recoveryPt,
      recovery_pd: settings.recoveryPd,
      recovery_rh: settings.recoveryRh,
      moisture_discount: settings.moistureDiscount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
}
