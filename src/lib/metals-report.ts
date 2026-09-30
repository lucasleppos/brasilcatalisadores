import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows, fetchAllByIds } from "@/lib/db";
import { loadHedges, type Hedge } from "@/lib/hedges";
import type { FlowKey } from "@/lib/reports";
import { FLOW_TITLES } from "@/lib/reports";

export const G_PER_OZT = 31.1035;
const DEFAULT_PIECE_WEIGHT_KG = 0.7;
const EXCLUDED = "conferencia_excluida";

export type MetalOrigin = "Laboratório" | "Catálogo" | "Pendente";

export interface MetalPurchaseRow {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierName: string;
  buyer: string;
  location: string;
  flow: FlowKey;
  flowLabel: string;
  hedge: Hedge | null;
  weightKg: number;
  ptG: number;
  pdG: number;
  rhG: number;
  totalBrl: number;
  origin: MetalOrigin;
}

export interface MetalsReportFilters {
  from?: Date;
  to?: Date;
  hedgeId?: string;
  flow?: FlowKey;
  buyer?: string;
  supplier?: string;
  search?: string;
}

export interface MetalsReport {
  rows: MetalPurchaseRow[];
  totals: { count: number; weightKg: number; ptG: number; pdG: number; rhG: number; totalBrl: number };
  buyers: string[];
  suppliers: string[];
  hedges: Hedge[];
}

export const toOzt = (g: number) => g / G_PER_OZT;

export function hedgeLabel(h: Hedge | null): string {
  if (!h) return "Sem hedge";
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${h.name} — Pt US$ ${n(h.ptPrice)} / Pd US$ ${n(h.pdPrice)} / Rh US$ ${n(h.rhPrice)} | US$ 1 = R$ ${n(h.usdToBrl)}`;
}

export async function loadMetalsReport(filters: MetalsReportFilters = {}): Promise<MetalsReport> {
  const [purchases, hedges] = await Promise.all([
    fetchAllRows<any>(() => {
      let q = supabase
        .from("purchases")
        .select(
          "id, purchase_number, date, supplier_name, buyer, location, status, op_status, material_flow, total_brl, hedge_id, weight_real, weight_declared, bulk_weight"
        )
        .order("date", { ascending: false });
      if (filters.from) q = q.gte("date", filters.from.toISOString());
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        q = q.lte("date", end.toISOString());
      }
      return q as any;
    }),
    loadHedges(),
  ]);

  const ids = purchases.map((p) => p.id);

  const items = ids.length
    ? await fetchAllByIds<any>(ids, (chunk) =>
        supabase
          .from("purchase_items")
          .select("id, purchase_id, item_type, category, quantity, weight, weight_real, catalog_part_id")
          .in("purchase_id", chunk) as any
      )
    : [];

  const [labRows, evidence] = await Promise.all([
    ids.length
      ? fetchAllByIds<any>(ids, (chunk) =>
          supabase
            .from("lab_results")
            .select("purchase_id, purchase_item_id, versao, pt_ppm, pd_ppm, rh_ppm")
            .in("purchase_id", chunk) as any
        )
      : Promise.resolve([] as any[]),
    ids.length
      ? fetchAllByIds<any>(ids, (chunk) =>
          supabase
            .from("stage_evidence")
            .select("purchase_id, task_key, value_numeric, created_at")
            .in("purchase_id", chunk)
            .in("task_key", [
              "weight_flex_trituracao",
              "weight_carbono_trituracao",
              "weight_flex_extraido",
              "weight_carbono_extraido",
            ]) as any
        )
      : Promise.resolve([] as any[]),
  ]);

  const partIds = Array.from(new Set(items.map((it) => it.catalog_part_id).filter((v): v is string => !!v)));
  const parts = partIds.length
    ? await fetchAllByIds<any>(partIds, (chunk) =>
        supabase.from("catalog_parts").select("id, weight, pt_ppm, pd_ppm, rh_ppm").in("id", chunk) as any
      )
    : [];
  const partMap = new Map<string, { weight: number; pt: number; pd: number; rh: number }>(
    parts.map((p) => [
      p.id as string,
      { weight: Number(p.weight) || 0, pt: Number(p.pt_ppm) || 0, pd: Number(p.pd_ppm) || 0, rh: Number(p.rh_ppm) || 0 },
    ])
  );

  const hedgeMap = new Map(hedges.map((h) => [h.id, h]));

  // agrupamentos
  const itemsByPurchase = new Map<string, any[]>();
  const sacolaIds = new Set<string>();
  for (const it of items) {
    const arr = itemsByPurchase.get(it.purchase_id) || [];
    arr.push(it);
    itemsByPurchase.set(it.purchase_id, arr);
    if (it.item_type === "peca_sacola") sacolaIds.add(it.purchase_id);
  }

  const labByPurchase = new Map<string, any[]>();
  for (const l of labRows) {
    const arr = labByPurchase.get(l.purchase_id) || [];
    arr.push(l);
    labByPurchase.set(l.purchase_id, arr);
  }

  const evByPurchase = new Map<string, Map<string, number>>();
  const evTime = new Map<string, string>();
  for (const e of evidence) {
    const m = evByPurchase.get(e.purchase_id) || new Map<string, number>();
    const tkey = `${e.purchase_id}|${e.task_key}`;
    const prev = evTime.get(tkey);
    if (!prev || String(e.created_at) >= prev) {
      evTime.set(tkey, String(e.created_at));
      m.set(e.task_key, Number(e.value_numeric) || 0);
    }
    evByPurchase.set(e.purchase_id, m);
  }

  const flowOf = (p: any): FlowKey => {
    if (p.material_flow === "ceramico") return "ceramico";
    if (p.material_flow === "sacola") return "sacola";
    if (p.material_flow === "pecas") return "pecas";
    return sacolaIds.has(p.id) ? "sacola" : "pecas";
  };

  const activeItems = (pid: string) => (itemsByPurchase.get(pid) || []).filter((it) => it.category !== EXCLUDED);

  const pieceWeightOf = (pid: string) => {
    let total = 0;
    for (const it of activeItems(pid)) {
      const qty = Number(it.quantity) || 1;
      const real = Number(it.weight_real) || 0;
      if (real > 0) {
        total += real;
        continue;
      }
      const cat = it.catalog_part_id ? partMap.get(it.catalog_part_id)?.weight || 0 : 0;
      const own = Number(it.weight) || 0;
      const unit = cat > 0 ? cat : own > 0 ? own : DEFAULT_PIECE_WEIGHT_KG;
      total += unit * qty;
    }
    return total;
  };

  const weightOf = (p: any, flow: FlowKey): number => {
    if (flow === "ceramico") {
      const real = Number(p.weight_real) || 0;
      if (real > 0) return real;
      const bulk = Number(p.bulk_weight) || 0;
      if (bulk > 0) return bulk;
      const declared = Number(p.weight_declared) || 0;
      if (declared > 0) return declared;
      return pieceWeightOf(p.id);
    }
    if (flow === "sacola") {
      const ev = evByPurchase.get(p.id);
      if (ev) {
        const trit = (ev.get("weight_flex_trituracao") || 0) + (ev.get("weight_carbono_trituracao") || 0);
        if (trit > 0) return trit;
        const extr = (ev.get("weight_flex_extraido") || 0) + (ev.get("weight_carbono_extraido") || 0);
        if (extr > 0) return extr;
      }
      return pieceWeightOf(p.id);
    }
    // Peças: pesos do processo quando existirem, senão catálogo/conferência
    const ev = evByPurchase.get(p.id);
    if (ev) {
      const trit = (ev.get("weight_flex_trituracao") || 0) + (ev.get("weight_carbono_trituracao") || 0);
      if (trit > 0) return trit;
    }
    return pieceWeightOf(p.id);
  };

  /** PPMs do laboratório: prioriza a última versão global; senão média das análises por item. */
  const labPpm = (pid: string): { pt: number; pd: number; rh: number } | null => {
    const rows = labByPurchase.get(pid);
    if (!rows || rows.length === 0) return null;
    const global = rows.filter((r) => !r.purchase_item_id);
    const pick = global.length ? global : rows;
    if (global.length) {
      const latest = pick.reduce((a, b) => ((Number(b.versao) || 0) >= (Number(a.versao) || 0) ? b : a));
      return { pt: Number(latest.pt_ppm) || 0, pd: Number(latest.pd_ppm) || 0, rh: Number(latest.rh_ppm) || 0 };
    }
    // por item: usa a última versão de cada item e faz a média simples
    const byItem = new Map<string, any>();
    for (const r of pick) {
      const cur = byItem.get(r.purchase_item_id);
      if (!cur || (Number(r.versao) || 0) >= (Number(cur.versao) || 0)) byItem.set(r.purchase_item_id, r);
    }
    const list = Array.from(byItem.values());
    if (!list.length) return null;
    const avg = (k: string) => list.reduce((s, r) => s + (Number(r[k]) || 0), 0) / list.length;
    return { pt: avg("pt_ppm"), pd: avg("pd_ppm"), rh: avg("rh_ppm") };
  };

  const rows: MetalPurchaseRow[] = purchases.map((p) => {
    const flow = flowOf(p);
    const weightKg = weightOf(p, flow);
    const lab = labPpm(p.id);

    let ptG = 0;
    let pdG = 0;
    let rhG = 0;
    let origin: MetalOrigin = "Pendente";

    if (lab && (lab.pt > 0 || lab.pd > 0 || lab.rh > 0)) {
      // metal contido bruto: kg × ppm / 1000 = gramas
      ptG = (weightKg * lab.pt) / 1000;
      pdG = (weightKg * lab.pd) / 1000;
      rhG = (weightKg * lab.rh) / 1000;
      origin = "Laboratório";
    } else {
      let any = false;
      for (const it of activeItems(p.id)) {
        const part = it.catalog_part_id ? partMap.get(it.catalog_part_id) : undefined;
        if (!part) continue;
        const qty = Number(it.quantity) || 1;
        const real = Number(it.weight_real) || 0;
        const kg = real > 0 ? real : (part.weight || 0) * qty;
        if (!kg) continue;
        ptG += (kg * part.pt) / 1000;
        pdG += (kg * part.pd) / 1000;
        rhG += (kg * part.rh) / 1000;
        any = true;
      }
      origin = any ? "Catálogo" : "Pendente";
    }

    return {
      id: p.id,
      purchaseNumber: p.purchase_number,
      date: p.date,
      supplierName: p.supplier_name || "",
      buyer: p.buyer || "",
      location: p.location || "",
      flow,
      flowLabel: FLOW_TITLES[flow],
      hedge: p.hedge_id ? hedgeMap.get(p.hedge_id) ?? null : null,
      weightKg,
      ptG,
      pdG,
      rhG,
      totalBrl: Number(p.total_brl) || 0,
      origin,
    };
  });

  const buyers = Array.from(new Set(rows.map((r) => r.buyer).filter(Boolean))).sort();
  const suppliers = Array.from(new Set(rows.map((r) => r.supplierName).filter(Boolean))).sort();

  const search = (filters.search || "").trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filters.hedgeId && filters.hedgeId !== "all") {
      if (filters.hedgeId === "none" ? r.hedge !== null : r.hedge?.id !== filters.hedgeId) return false;
    }
    if (filters.flow && (filters.flow as string) !== "all" && r.flow !== filters.flow) return false;
    if (filters.buyer && filters.buyer !== "all" && r.buyer !== filters.buyer) return false;
    if (filters.supplier && filters.supplier !== "all" && r.supplierName !== filters.supplier) return false;
    if (search && !r.purchaseNumber.toLowerCase().includes(search)) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => ({
      count: acc.count + 1,
      weightKg: acc.weightKg + r.weightKg,
      ptG: acc.ptG + r.ptG,
      pdG: acc.pdG + r.pdG,
      rhG: acc.rhG + r.rhG,
      totalBrl: acc.totalBrl + r.totalBrl,
    }),
    { count: 0, weightKg: 0, ptG: 0, pdG: 0, rhG: 0, totalBrl: 0 }
  );

  return { rows: filtered, totals, buyers, suppliers, hedges };
}
