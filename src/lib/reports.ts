import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

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
  let query = supabase
    .from("purchases")
    .select("id, date, total_brl, supplier_name, location");

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

  const { data, error } = await query;
  if (error) throw error;

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
  const { data, error } = await supabase
    .from("bags")
    .select("bag_number, status, total_weight, total_paid_brl, refiner_total_value, closed_at")
    .order("bag_number");

  if (error) throw error;

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
  const { data, error } = await supabase
    .from("purchases")
    .select("status, status_history");

  if (error) throw error;

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
  const [purchasesRes, bagsRes, settingsRes] = await Promise.all([
    supabase.from("purchases").select("date, total_brl"),
    supabase.from("bags").select("refiner_total_value, total_paid_brl"),
    supabase.from("settings").select("usd_to_brl").limit(1).single(),
  ]);

  if (purchasesRes.error) throw purchasesRes.error;

  const purchases = purchasesRes.data || [];
  const bags = bagsRes.data || [];
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
