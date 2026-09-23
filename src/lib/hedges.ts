import { supabase } from "@/integrations/supabase/client";
import { Settings, loadSettings } from "./settings";

export interface Hedge {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  ptPrice: number;
  pdPrice: number;
  rhPrice: number;
  usdToBrl: number;
  ptOzContracted: number;
  pdOzContracted: number;
  rhOzContracted: number;
  notes: string | null;
}

export interface HedgeUsage {
  pt: number;
  pd: number;
  rh: number;
  purchases: number;
}

const db = supabase as any;

function rowToHedge(r: any): Hedge {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    ptPrice: Number(r.pt_price),
    pdPrice: Number(r.pd_price),
    rhPrice: Number(r.rh_price),
    usdToBrl: Number(r.usd_to_brl),
    ptOzContracted: Number(r.pt_oz_contracted) || 0,
    pdOzContracted: Number(r.pd_oz_contracted) || 0,
    rhOzContracted: Number(r.rh_oz_contracted) || 0,
    notes: r.notes,
  };
}

export async function loadHedges(): Promise<Hedge[]> {
  const { data } = await db.from("hedges").select("*").order("start_date", { ascending: false });
  return (data ?? []).map(rowToHedge);
}

export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function isActive(h: Hedge, day = todayIso()): boolean {
  return h.startDate <= day && (!h.endDate || h.endDate >= day);
}

export async function loadActiveHedge(): Promise<Hedge | null> {
  const list = await loadHedges();
  return list.find(h => isActive(h)) ?? null;
}

export async function saveHedge(h: Omit<Hedge, "id"> & { id?: string }) {
  const row = {
    name: h.name,
    start_date: h.startDate,
    end_date: h.endDate || null,
    pt_price: h.ptPrice,
    pd_price: h.pdPrice,
    rh_price: h.rhPrice,
    usd_to_brl: h.usdToBrl,
    pt_oz_contracted: h.ptOzContracted,
    pd_oz_contracted: h.pdOzContracted,
    rh_oz_contracted: h.rhOzContracted,
    notes: h.notes,
  };
  const res = h.id
    ? await db.from("hedges").update(row).eq("id", h.id)
    : await db.from("hedges").insert(row);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteHedge(id: string) {
  const { count } = await db.from("purchases").select("id", { count: "exact", head: true }).eq("hedge_id", id);
  if ((count ?? 0) > 0) throw new Error("Hedge com compras vinculadas não pode ser apagado, apenas encerrado.");
  const { error } = await db.from("hedges").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadHedgeUsage(): Promise<Record<string, HedgeUsage>> {
  const { data } = await db.from("hedge_consumption").select("hedge_id, pt_oz, pd_oz, rh_oz");
  const out: Record<string, HedgeUsage> = {};
  for (const r of data ?? []) {
    const u = (out[r.hedge_id] ??= { pt: 0, pd: 0, rh: 0, purchases: 0 });
    u.pt += Number(r.pt_oz) || 0;
    u.pd += Number(r.pd_oz) || 0;
    u.rh += Number(r.rh_oz) || 0;
    u.purchases += 1;
  }
  return out;
}

export async function loadHedgePurchases(hedgeId: string) {
  const [{ data: ps }, { data: cons }] = await Promise.all([
    db.from("purchases").select("id, purchase_number, supplier_name, status, date").eq("hedge_id", hedgeId).order("date"),
    db.from("hedge_consumption").select("purchase_id, pt_oz, pd_oz, rh_oz").eq("hedge_id", hedgeId),
  ]);
  const byP = new Map((cons ?? []).map((c: any) => [c.purchase_id, c]));
  return (ps ?? []).map((p: any) => ({ ...p, consumption: byP.get(p.id) ?? null }));
}

export function applyHedge(settings: Settings, h: Hedge | null): Settings {
  if (!h) return settings;
  return { ...settings, ptPrice: h.ptPrice, pdPrice: h.pdPrice, rhPrice: h.rhPrice, usdToBrl: h.usdToBrl };
}

/** Configurações com as cotações do hedge da compra (compras antigas sem hedge mantêm as cotações atuais). */
export async function loadSettingsForPurchase(purchaseId?: string | null): Promise<Settings> {
  const settings = await loadSettings();
  if (!purchaseId) return settings;
  const hedge = await getPurchaseHedge(purchaseId);
  return applyHedge(settings, hedge);
}

export async function getPurchaseHedge(purchaseId: string): Promise<Hedge | null> {
  const { data: p } = await db.from("purchases").select("hedge_id").eq("id", purchaseId).maybeSingle();
  if (!p?.hedge_id) return null;
  const { data: h } = await db.from("hedges").select("*").eq("id", p.hedge_id).maybeSingle();
  return h ? rowToHedge(h) : null;
}

/** Settings para a calculadora avulsa: hedge vigente do dia. */
export async function loadSettingsWithActiveHedge(): Promise<Settings> {
  const [s, h] = await Promise.all([loadSettings(), loadActiveHedge()]);
  return applyHedge(s, h);
}

export async function changePurchaseHedge(purchaseId: string, fromId: string | null, toId: string, justification: string) {
  const log = await db.from("hedge_change_log").insert({
    purchase_id: purchaseId, from_hedge_id: fromId, to_hedge_id: toId, justification: justification.trim(),
  });
  if (log.error) throw new Error("Sem permissão para trocar o hedge ou justificativa inválida.");
  const upd = await db.from("purchases").update({ hedge_id: toId }).eq("id", purchaseId);
  if (upd.error) throw new Error(upd.error.message);
  await db.from("hedge_consumption").update({ hedge_id: toId }).eq("purchase_id", purchaseId);
}

export async function loadHedgeChangeLog(purchaseId: string) {
  const { data } = await db.from("hedge_change_log").select("*").eq("purchase_id", purchaseId).order("created_at", { ascending: false });
  return data ?? [];
}

const KG_TO_LB = 2.20462;
const G_PER_LB = 453.592;
const G_PER_OZ = 31.1035;

/**
 * Registra o consumo de metal (onças pagáveis) da compra no hedge dela.
 * Usa os calc_result gravados nos itens quando existirem; senão, peso × PPM.
 */
export async function recordHedgeConsumption(purchaseId: string) {
  const { data: p } = await db.from("purchases").select("hedge_id").eq("id", purchaseId).maybeSingle();
  if (!p?.hedge_id) return;
  const [{ data: items }, settings] = await Promise.all([
    db.from("purchase_items").select("weight, weight_real, calc_input, calc_result, category").eq("purchase_id", purchaseId),
    loadSettings(),
  ]);
  let pt = 0, pd = 0, rh = 0;
  for (const it of items ?? []) {
    if (it.category === "conferencia_excluida") continue;
    const r = it.calc_result as any;
    if (r && (r.ptTroyOz != null || r.pdTroyOz != null)) {
      pt += Number(r.ptTroyOz) || 0; pd += Number(r.pdTroyOz) || 0; rh += Number(r.rhTroyOz) || 0;
      continue;
    }
    const ci = it.calc_input as any;
    const kg = Number(it.weight_real ?? it.weight) || 0;
    if (!ci || !kg) continue;
    const dryG = kg * KG_TO_LB * (1 - settings.moistureDiscount / 100) * G_PER_LB;
    pt += ((Number(ci.ptPpm) || 0) * dryG / 1e6) * (settings.recoveryPt / 100) / G_PER_OZ;
    pd += ((Number(ci.pdPpm) || 0) * dryG / 1e6) * (settings.recoveryPd / 100) / G_PER_OZ;
    rh += ((Number(ci.rhPpm) || 0) * dryG / 1e6) * (settings.recoveryRh / 100) / G_PER_OZ;
  }
  await db.from("hedge_consumption").upsert(
    { hedge_id: p.hedge_id, purchase_id: purchaseId, pt_oz: pt, pd_oz: pd, rh_oz: rh },
    { onConflict: "purchase_id" },
  );
}

export async function removeHedgeConsumption(purchaseId: string) {
  await db.from("hedge_consumption").delete().eq("purchase_id", purchaseId);
}
