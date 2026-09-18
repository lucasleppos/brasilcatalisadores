import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows, fetchAllByIds } from "@/lib/db";
import { STAGES, STAGE_ORDER, stageOfStatus } from "@/lib/status-stages";
import { getFlowStatuses } from "@/lib/purchases";
import * as XLSX from "xlsx";

// ─── Relatório diário de compras (Dashboard) ───

export type FlowKey = "ceramico" | "pecas" | "sacola";

export const FLOW_KEYS: FlowKey[] = ["ceramico", "pecas", "sacola"];

export const FLOW_TITLES: Record<FlowKey, string> = {
  ceramico: "Cerâmico",
  pecas: "Peças",
  sacola: "Peça em Sacola",
};

export interface DailyRow {
  day: number;
  date: string;
  count: number;
  value: number;
  byFlow: Record<FlowKey, { count: number; value: number }>;
}

export interface DailyPurchaseReport {
  included: DailyRow[];
  completed: DailyRow[];
  chart: {
    day: number;
    included_value: number;
    completed_value: number;
    included_cum: number;
    completed_cum: number;
  }[];
  totals: {
    included: { count: number; value: number; byFlow: Record<FlowKey, { count: number; value: number }> };
    completed: { count: number; value: number; byFlow: Record<FlowKey, { count: number; value: number }> };
  };
}

function emptyByFlow(): Record<FlowKey, { count: number; value: number }> {
  return {
    ceramico: { count: 0, value: 0 },
    pecas: { count: 0, value: 0 },
    sacola: { count: 0, value: 0 },
  };
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Índice da etapa na ordem genérica (-1 se desconhecida). */
function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage);
}

const APROVACAO_INDEX = STAGE_ORDER.indexOf(STAGES.aprovacao);

const FLOW_TO_MATERIAL: Record<FlowKey, "ceramico" | "pecas" | "sacola"> = {
  ceramico: "ceramico",
  pecas: "pecas",
  sacola: "sacola",
};

/**
 * Compra concluída conforme a sequência do próprio fluxo:
 * em Peças, Corte e Trituração/Moagem vêm DEPOIS da Aprovação e contam como concluídas.
 */
function isCompletedForFlow(status: string, opStatus: string | null | undefined, flow: FlowKey): boolean {
  if (opStatus === "Bag Alocado" || opStatus === "Alocando Bag") return true;
  if (status && status.includes("Demonstrativo Contestado")) return false;
  if (flow === "pecas" && status === "Peças: Peso Divergente") return true;

  const seq = getFlowStatuses(FLOW_TO_MATERIAL[flow]);
  const approvalIdx = seq.findIndex((s) => s.includes("Gerar Boleto de Aprovação"));
  const idx = seq.indexOf(status);
  if (idx >= 0 && approvalIdx >= 0) return idx > approvalIdx;

  return stageIndex(stageOfStatus(status, opStatus)) > APROVACAO_INDEX;
}

/** Data em que a compra passou da Aprovação no seu fluxo (ou null se ainda não passou). */
function completionDate(p: any, flow: FlowKey): string | null {
  const history = Array.isArray(p.status_history)
    ? (p.status_history as Array<{ status: string; date: string }>)
    : [];
  if (!isCompletedForFlow(p.status, p.op_status, flow)) return null;
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (h?.status && h?.date && isCompletedForFlow(h.status, null, flow)) return h.date;
  }
  const last = history[history.length - 1];
  return last?.date || p.date || null;
}


export async function loadDailyPurchaseReport(monthStart: Date, monthEnd: Date): Promise<DailyPurchaseReport> {
  // Busca margem maior: compras criadas antes do mês podem ter sido concluídas no mês.
  const searchFrom = new Date(monthStart);
  searchFrom.setFullYear(searchFrom.getFullYear() - 2);

  const purchases = await fetchAllRows<any>(() =>
    supabase
      .from("purchases")
      .select("id, purchase_number, date, total_brl, status, op_status, material_flow, status_history")
      .gte("date", searchFrom.toISOString())
      .lte("date", monthEnd.toISOString()) as any
  );

  // Classifica compras antigas sem material_flow pelos itens.
  const unknown = purchases.filter((p) => !p.material_flow);
  const sacolaIds = new Set<string>();
  if (unknown.length > 0) {
    const items = await fetchAllByIds<any>(
      unknown.map((p) => p.id),
      (chunk) => supabase.from("purchase_items").select("purchase_id, item_type").in("purchase_id", chunk) as any
    );
    for (const it of items) if (it.item_type === "peca_sacola") sacolaIds.add(it.purchase_id);
  }

  const flowOf = (p: any): FlowKey => {
    if (p.material_flow === "ceramico") return "ceramico";
    if (p.material_flow === "sacola") return "sacola";
    if (p.material_flow === "pecas") return "pecas";
    return sacolaIds.has(p.id) ? "sacola" : "pecas";
  };

  const daysInMonth = monthEnd.getDate();
  const makeRows = (): DailyRow[] =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
      return {
        day: i + 1,
        date: localDayKey(d.toISOString()),
        count: 0,
        value: 0,
        byFlow: emptyByFlow(),
      };
    });

  const included = makeRows();
  const completed = makeRows();
  const monthKeyPrefix = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  const add = (rows: DailyRow[], iso: string, flow: FlowKey, value: number) => {
    const key = localDayKey(iso);
    if (!key.startsWith(monthKeyPrefix)) return;
    const day = Number(key.slice(8));
    const row = rows[day - 1];
    if (!row) return;
    row.count += 1;
    row.value += value;
    row.byFlow[flow].count += 1;
    row.byFlow[flow].value += value;
  };

  for (const p of purchases) {
    const flow = flowOf(p);
    const value = Number(p.total_brl) || 0;
    if (p.date) add(included, p.date, flow, value);
    const done = completionDate(p, flow);
    if (done) add(completed, done, flow, value);
  }

  let incCum = 0;
  let compCum = 0;
  const chart = included.map((row, i) => {
    incCum += row.value;
    compCum += completed[i].value;
    return {
      day: row.day,
      included_value: row.value,
      completed_value: completed[i].value,
      included_cum: incCum,
      completed_cum: compCum,
    };
  });

  const sum = (rows: DailyRow[]) => {
    const byFlow = emptyByFlow();
    let count = 0;
    let value = 0;
    for (const r of rows) {
      count += r.count;
      value += r.value;
      for (const k of FLOW_KEYS) {
        byFlow[k].count += r.byFlow[k].count;
        byFlow[k].value += r.byFlow[k].value;
      }
    }
    return { count, value, byFlow };
  };

  return {
    included,
    completed,
    chart,
    totals: { included: sum(included), completed: sum(completed) },
  };
}

// ─── Previsão da fila (compras que ainda não passaram da Aprovação) ───

export interface PipelineFlowStat {
  pendingCount: number;
  pendingWeight: number;
  pendingUnits: number;
  avgPerKg: number | null;
  avgPerUnit: number | null;
  forecast: number;
}

export type PipelineForecast = Record<FlowKey, PipelineFlowStat>;

const EXCLUDED_ITEM_CATEGORY = "conferencia_excluida";

export async function loadPipelineForecast(monthStart: Date, monthEnd: Date): Promise<PipelineForecast> {
  const from24 = new Date(monthStart.getFullYear() - 2, monthStart.getMonth(), 1);

  const purchases = await fetchAllRows<any>(() =>
    supabase
      .from("purchases")
      .select(
        "id, date, total_brl, status, op_status, material_flow, status_history, weight_real, weight_declared, bulk_weight"
      )
      .gte("date", from24.toISOString()) as any
  );

  const items = await fetchAllByIds<any>(
    purchases.map((p) => p.id),
    (chunk) =>
      supabase
        .from("purchase_items")
        .select("purchase_id, item_type, quantity, weight, category")
        .in("purchase_id", chunk) as any
  );

  const sacolaIds = new Set<string>();
  const agg = new Map<string, { weight: number; units: number }>();
  for (const it of items) {
    if (it.item_type === "peca_sacola") sacolaIds.add(it.purchase_id);
    if (it.category === EXCLUDED_ITEM_CATEGORY) continue;
    const cur = agg.get(it.purchase_id) || { weight: 0, units: 0 };
    const qty = Number(it.quantity) || 0;
    cur.weight += (Number(it.weight) || 0) * (qty || 1);
    cur.units += qty;
    agg.set(it.purchase_id, cur);
  }

  const flowOf = (p: any): FlowKey => {
    if (p.material_flow === "ceramico") return "ceramico";
    if (p.material_flow === "sacola") return "sacola";
    if (p.material_flow === "pecas") return "pecas";
    return sacolaIds.has(p.id) ? "sacola" : "pecas";
  };

  const weightOf = (p: any): number => {
    const real = Number(p.weight_real) || 0;
    if (real > 0) return real;
    const bulk = Number(p.bulk_weight) || 0;
    if (bulk > 0) return bulk;
    const declared = Number(p.weight_declared) || 0;
    if (declared > 0) return declared;
    return agg.get(p.id)?.weight || 0;
  };
  const unitsOf = (p: any): number => agg.get(p.id)?.units || 0;

  const pending: Record<FlowKey, { count: number; weight: number; units: number }> = {
    ceramico: { count: 0, weight: 0, units: 0 },
    pecas: { count: 0, weight: 0, units: 0 },
    sacola: { count: 0, weight: 0, units: 0 },
  };
  const hist: Record<FlowKey, { value: number; weight: number; units: number }> = {
    ceramico: { value: 0, weight: 0, units: 0 },
    pecas: { value: 0, weight: 0, units: 0 },
    sacola: { value: 0, weight: 0, units: 0 },
  };

  for (const p of purchases) {
    const flow = flowOf(p);
    const value = Number(p.total_brl) || 0;
    if (isCompletedForFlow(p.status, p.op_status, flow)) {
      const done = completionDate(p, flow);
      const d = done ? new Date(done) : null;
      if (value > 0 && d && d >= monthStart && d <= monthEnd) {
        hist[flow].value += value;
        hist[flow].weight += weightOf(p);
        hist[flow].units += unitsOf(p);
      }
      continue;
    }
    pending[flow].count += 1;
    pending[flow].weight += weightOf(p);
    pending[flow].units += unitsOf(p);
  }

  const out = {} as PipelineForecast;
  for (const k of FLOW_KEYS) {
    const h = hist[k];
    const avgPerKg = h.value > 0 && h.weight > 0 ? h.value / h.weight : null;
    const avgPerUnit = h.value > 0 && h.units > 0 ? h.value / h.units : null;
    const p = pending[k];
    let forecast = 0;
    if (p.weight > 0 && avgPerKg !== null) forecast = p.weight * avgPerKg;
    else if (avgPerUnit !== null) forecast = p.units * avgPerUnit;
    out[k] = {
      pendingCount: p.count,
      pendingWeight: p.weight,
      pendingUnits: p.units,
      avgPerKg,
      avgPerUnit,
      forecast,
    };
  }
  return out;
}


export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface PurchaseSummaryRow {
  month: string;
  total_brl: number;
  count: number;
}

export interface SupplierRanking {
  supplier_name: string;
  total_brl: number;
  count: number;
  total_weight: number;
}

export interface BagAnalysisRow {
  bag_number: string;
  status: string;
  total_weight: number;
  total_paid_brl: number;
  refiner_total_value: number | null;
  margin_pct: number | null;
}

export interface PipelineRow {
  status: string;
  count: number;
  avg_days: number | null;
}

export interface DashboardKPIs {
  total_invested: number;
  total_refiner: number;
  avg_margin: number;
  usd_to_brl: number;
  monthly_evolution: { month: string; invested: number }[];
}

// ─── Purchases Summary ───

export async function loadPurchasesSummary(
  dateRange?: DateRange,
  supplierFilter?: string,
  locationFilter?: string
) {
  const data = await fetchAllRows<any>(() => {
    let query = supabase
      .from("purchases")
      .select("id, date, total_brl, supplier_name, location")
      .order("date", { ascending: true });

    if (dateRange?.from) {
      query = query.gte("date", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      query = query.lte("date", dateRange.to.toISOString());
    }
    if (supplierFilter) {
      query = query.eq("supplier_name", supplierFilter);
    }
    if (locationFilter) {
      query = query.eq("location", locationFilter);
    }
    return query as any;
  });

  // Group by month
  const monthMap = new Map<string, { total_brl: number; count: number }>();
  const supplierMap = new Map<string, { total_brl: number; count: number; weight: number }>();

  for (const p of data || []) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = monthMap.get(key) || { total_brl: 0, count: 0 };
    cur.total_brl += Number(p.total_brl) || 0;
    cur.count += 1;
    monthMap.set(key, cur);

    const sc = supplierMap.get(p.supplier_name) || { total_brl: 0, count: 0, weight: 0 };
    sc.total_brl += Number(p.total_brl) || 0;
    sc.count += 1;
    supplierMap.set(p.supplier_name, sc);
  }

  const monthly: PurchaseSummaryRow[] = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const suppliers: SupplierRanking[] = Array.from(supplierMap.entries())
    .map(([supplier_name, v]) => ({
      supplier_name,
      total_brl: v.total_brl,
      count: v.count,
      total_weight: v.weight,
    }))
    .sort((a, b) => b.total_brl - a.total_brl);

  return { monthly, suppliers, raw: data || [] };
}

// ─── Bags Analysis ───

export async function loadBagsAnalysis() {
  const data = await fetchAllRows<any>(() =>
    supabase
      .from("bags")
      .select("bag_number, status, total_weight, total_paid_brl, refiner_total_value, closed_at")
      .order("bag_number") as any
  );

  const rows: BagAnalysisRow[] = (data || []).map((b) => {
    const paid = Number(b.total_paid_brl) || 0;
    const refiner = Number(b.refiner_total_value) || 0;
    const margin = paid > 0 && refiner > 0 ? ((refiner - paid) / paid) * 100 : null;
    return {
      bag_number: b.bag_number,
      status: b.status,
      total_weight: Number(b.total_weight) || 0,
      total_paid_brl: paid,
      refiner_total_value: refiner || null,
      margin_pct: margin,
    };
  });

  const closedBags = rows.filter((r) => r.status === "Fechado");
  const totalWeight = rows.reduce((s, r) => s + r.total_weight, 0);
  const totalPaid = rows.reduce((s, r) => s + r.total_paid_brl, 0);
  const totalRefiner = rows.reduce((s, r) => s + (r.refiner_total_value || 0), 0);

  return { rows, closedCount: closedBags.length, totalWeight, totalPaid, totalRefiner };
}

// ─── Pipeline ───

const STATUS_ORDER = [
  "Recebimento",
  "Processamento",
  "Análise",
  "Exportação",
  "Concluído",
];

export async function loadPipelineData() {
  const data = await fetchAllRows<any>(() =>
    supabase.from("purchases").select("status, status_history").order("date", { ascending: true }) as any
  );

  const statusCount = new Map<string, number>();
  const stageDurations = new Map<string, number[]>();

  for (const p of data || []) {
    const c = statusCount.get(p.status) || 0;
    statusCount.set(p.status, c + 1);

    // Parse status_history to compute average days per stage
    const history = Array.isArray(p.status_history) ? p.status_history as Array<{ status: string; date: string }> : [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      if (prev?.date && curr?.date && prev?.status) {
        const days = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24);
        const arr = stageDurations.get(prev.status) || [];
        arr.push(days);
        stageDurations.set(prev.status, arr);
      }
    }
  }

  const pipeline: PipelineRow[] = STATUS_ORDER.map((status) => {
    const durations = stageDurations.get(status) || [];
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return {
      status,
      count: statusCount.get(status) || 0,
      avg_days: avg !== null ? Math.round(avg * 10) / 10 : null,
    };
  });

  return pipeline;
}

// ─── Dashboard KPIs ───

export async function loadDashboardKPIs(): Promise<DashboardKPIs> {
  const [purchases, bags, settingsRes] = await Promise.all([
    fetchAllRows<any>(() =>
      supabase.from("purchases").select("date, total_brl").order("date", { ascending: true }) as any
    ),
    fetchAllRows<any>(() =>
      supabase.from("bags").select("refiner_total_value, total_paid_brl").order("bag_number") as any
    ),
    supabase.from("settings").select("usd_to_brl").limit(1).single(),
  ]);
  const usd_to_brl = Number(settingsRes.data?.usd_to_brl) || 5;

  const total_invested = purchases.reduce((s, p) => s + (Number(p.total_brl) || 0), 0);
  const total_refiner = bags.reduce((s, b) => s + (Number(b.refiner_total_value) || 0), 0);
  const total_paid_bags = bags.reduce((s, b) => s + (Number(b.total_paid_brl) || 0), 0);
  const avg_margin = total_paid_bags > 0 ? ((total_refiner - total_paid_bags) / total_paid_bags) * 100 : 0;

  // Monthly evolution
  const monthMap = new Map<string, number>();
  for (const p of purchases) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + (Number(p.total_brl) || 0));
  }

  const monthly_evolution = Array.from(monthMap.entries())
    .map(([month, invested]) => ({ month, invested }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { total_invested, total_refiner, avg_margin, usd_to_brl, monthly_evolution };
}

// ─── Excel Export ───

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
