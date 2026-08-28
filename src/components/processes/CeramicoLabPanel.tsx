import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Save, Loader2, AlertTriangle, FlaskConical, History as HistoryIcon, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage, getContestInfo, isDieselGroup } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, parseNum } from "@/lib/utils";

interface AnalysisRow {
  id: string | null; // lab_results.id if persisted
  versao: number; // 1, 2, or 3
  pt: string;
  pd: string;
  rh: string;
}

interface HistoryEntry {
  id: string;
  itemId: string | null;
  versao: number;
  oldPt: number | null;
  oldPd: number | null;
  oldRh: number | null;
  newPt: number | null;
  newPd: number | null;
  newRh: number | null;
  action: string;
  by: string | null;
  at: string;
}

interface LabLote {
  itemId: string;
  category: string;
  weight: number;
  rows: AnalysisRow[]; // exactly 3 slots
  rescued?: boolean;
}

const emptyRow = (versao: number): AnalysisRow => ({
  id: null,
  versao,
  pt: "",
  pd: "",
  rh: "",
});

const isRowFilled = (r: AnalysisRow) =>
  r.pt.trim() !== "" && r.pd.trim() !== "" && r.rh.trim() !== "";

const isRowEmpty = (r: AnalysisRow) =>
  r.pt.trim() === "" && r.pd.trim() === "" && r.rh.trim() === "";

const savedRowCount = (l: LabLote) =>
  l.rows.filter(r => r.id !== null).length;

const filledRowCount = (l: LabLote) =>
  l.rows.filter(isRowFilled).length;

const calcAverage = (l: LabLote) => {
  const filled = l.rows.filter(isRowFilled);
  if (filled.length === 0) return null;
  const pt = filled.reduce((s, r) => s + parseNum(r.pt), 0) / filled.length;
  const pd = filled.reduce((s, r) => s + parseNum(r.pd), 0) / filled.length;
  const rh = filled.reduce((s, r) => s + parseNum(r.rh), 0) / filled.length;
  return { pt, pd, rh, n: filled.length };
};

interface Baseline { pt: number; pd: number; rh: number; n: number }

const BASELINE_STAGE = "analise_ceramico";
const baselineKey = (itemId: string) => `lab_baseline_${itemId}`;

// Snapshot da análise inicial (antes da contestação): para cada versão usa o
// valor mais antigo registrado no histórico (valor original) ou, se nunca foi
// alterado, o valor atual da linha.
const calcInitialSnapshot = (l: LabLote, history: HistoryEntry[]): Baseline | null => {
  const values: { pt: number; pd: number; rh: number }[] = [];
  [1, 2, 3].forEach(v => {
    const first = history
      .filter(h => h.itemId === l.itemId && h.versao === v)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0];
    if (first) {
      if (first.oldPt === null && first.oldPd === null && first.oldRh === null) return;
      values.push({ pt: first.oldPt ?? 0, pd: first.oldPd ?? 0, rh: first.oldRh ?? 0 });
      return;
    }
    const row = l.rows.find(r => r.versao === v);
    if (row && isRowFilled(row)) {
      values.push({ pt: parseNum(row.pt), pd: parseNum(row.pd), rh: parseNum(row.rh) });
    }
  });
  if (values.length === 0) return null;
  return {
    pt: values.reduce((s, r) => s + r.pt, 0) / values.length,
    pd: values.reduce((s, r) => s + r.pd, 0) / values.length,
    rh: values.reduce((s, r) => s + r.rh, 0) / values.length,
    n: values.length,
  };
};


interface CeramicoLabPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoLabPanel({ purchase, open, onOpenChange, onCompleted }: CeramicoLabPanelProps) {
  const [lotes, setLotes] = useState<LabLote[]>([]);
  const [dieselCount, setDieselCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null); // "itemId-versao"
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
  const [baselines, setBaselines] = useState<Record<string, Baseline>>({});

  const contestDate = getContestInfo(purchase)?.date ?? null;


  useEffect(() => {
    if (!open) return;
    loadLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("lab_result_history")
      .select("*")
      .eq("purchase_id", purchase.id)
      .order("created_at", { ascending: true });

    const entries: HistoryEntry[] = (data || []).map((h: any) => ({
      id: h.id,
      itemId: h.purchase_item_id,
      versao: Number(h.versao) || 1,
      oldPt: h.old_pt_ppm === null ? null : Number(h.old_pt_ppm),
      oldPd: h.old_pd_ppm === null ? null : Number(h.old_pd_ppm),
      oldRh: h.old_rh_ppm === null ? null : Number(h.old_rh_ppm),
      newPt: h.new_pt_ppm === null ? null : Number(h.new_pt_ppm),
      newPd: h.new_pd_ppm === null ? null : Number(h.new_pd_ppm),
      newRh: h.new_rh_ppm === null ? null : Number(h.new_rh_ppm),
      action: h.action || "update",
      by: h.changed_by,
      at: h.created_at,
    }));
    setHistory(entries);

    const ids = Array.from(new Set(entries.map(e => e.by).filter(Boolean))) as string[];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach(p => { map[p.id] = p.full_name || ""; });
      setNames(map);
    }
    return entries;
  };

  // Carrega (ou cria uma única vez) o snapshot congelado da análise inicial
  const loadBaselines = async (loteList: LabLote[], entries: HistoryEntry[]) => {
    if (!contestDate || loteList.length === 0) {
      setBaselines({});
      return;
    }
    const { data: ev } = await supabase
      .from("stage_evidence")
      .select("task_key, value_text")
      .eq("purchase_id", purchase.id)
      .eq("stage", BASELINE_STAGE)
      .like("task_key", "lab_baseline_%");

    const map: Record<string, Baseline> = {};
    (ev || []).forEach(e => {
      const itemId = e.task_key.replace("lab_baseline_", "");
      try {
        const parsed = JSON.parse(e.value_text || "");
        if (parsed && typeof parsed.pt === "number") {
          map[itemId] = { pt: parsed.pt, pd: parsed.pd, rh: parsed.rh, n: parsed.n || 1 };
        }
      } catch { /* ignore */ }
    });

    const toInsert: any[] = [];
    loteList.forEach(l => {
      if (map[l.itemId]) return;
      const snap = calcInitialSnapshot(l, entries);
      if (!snap) return;
      map[l.itemId] = snap;
      toInsert.push({
        purchase_id: purchase.id,
        stage: BASELINE_STAGE,
        task_key: baselineKey(l.itemId),
        data_type: "text",
        value_text: JSON.stringify({ ...snap, at: new Date().toISOString() }),
      });
    });
    if (toInsert.length > 0) {
      await supabase.from("stage_evidence").insert(toInsert);
    }
    setBaselines(map);
  };


  const loadLotes = async () => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, weight_loss, category, created_at")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia")
        .order("created_at", { ascending: true });

      if (!items || items.length === 0) {
        setLotes([]);
        setLoading(false);
        return;
      }

      const { data: evidence } = await supabase
        .from("stage_evidence")
        .select("task_key, value_text")
        .eq("purchase_id", purchase.id)
        .eq("stage", "conferencia_ceramico");

      const catMap: Record<string, string> = {};
      (evidence || []).forEach(e => {
        if (e.task_key.startsWith("lote_cat_")) {
          catMap[e.task_key.replace("lote_cat_", "")] = e.value_text || "";
        }
      });

      const { data: labResults } = await supabase
        .from("lab_results")
        .select("id, purchase_item_id, versao, pt_ppm, pd_ppm, rh_ppm, created_at")
        .eq("purchase_id", purchase.id)
        .not("purchase_item_id", "is", null)
        .order("created_at", { ascending: true });

      const currentIds = new Set(items.map(i => i.id));
      const toRow = (lr: any): AnalysisRow => ({
        id: lr.id,
        versao: Number(lr.versao) || 1,
        pt: String(lr.pt_ppm ?? ""),
        pd: String(lr.pd_ppm ?? ""),
        rh: String(lr.rh_ppm ?? ""),
      });

      const byItem: Record<string, AnalysisRow[]> = {};
      const orphanGroups: string[] = [];
      const orphanRows: Record<string, any[]> = {};

      (labResults || []).forEach(lr => {
        const pid = lr.purchase_item_id as string | null;
        if (!pid) return;
        const v = Number(lr.versao) || 1;
        if (v < 1 || v > 3) return;
        if (currentIds.has(pid)) {
          (byItem[pid] ||= []).push(toRow(lr));
        } else {
          if (!orphanRows[pid]) { orphanRows[pid] = []; orphanGroups.push(pid); }
          orphanRows[pid].push(lr);
        }
      });

      // Fallback: análises órfãs (itens recriados na contestação) mapeadas por ordem de criação
      const rescued = new Set<string>();
      if (Object.keys(byItem).length === 0 && orphanGroups.length > 0) {
        orphanGroups.slice(0, items.length).forEach((oldId, idx) => {
          const target = items[idx];
          if (!target) return;
          byItem[target.id] = orphanRows[oldId].map(toRow);
          rescued.add(target.id);
          supabase
            .from("lab_results")
            .update({ purchase_item_id: target.id })
            .eq("purchase_id", purchase.id)
            .eq("purchase_item_id", oldId)
            .then(() => undefined);
        });
      }

      const labItems = items.filter(item => !isDieselGroup(catMap[item.id]));
      setDieselCount(items.length - labItems.length);

      const loteList: LabLote[] = labItems.map(item => {
        const existing = byItem[item.id] || [];
        const rows: AnalysisRow[] = [1, 2, 3].map(v => {
          const found = existing.find(r => r.versao === v);
          return found || emptyRow(v);
        });
        return {
          itemId: item.id,
          category: catMap[item.id] || "Lote",
          weight: Math.max(0, (Number(item.weight) || 0) - (Number(item.weight_loss) || 0)),
          rows,
          rescued: rescued.has(item.id),
        };
      });
      setLotes(loteList);

      const entries = await loadHistory();
      await loadBaselines(loteList, entries);

    } finally {
      setLoading(false);
    }
  };

  const updateField = (
    loteIdx: number,
    versao: number,
    field: "pt" | "pd" | "rh",
    value: string
  ) => {
    const clean = value.replace(/[^0-9.,]/g, "");
    setLotes(prev => prev.map((l, i) => {
      if (i !== loteIdx) return l;
      return {
        ...l,
        rows: l.rows.map(r => r.versao === versao ? { ...r, [field]: clean } : r),
      };
    }));
  };

  const logHistory = async (
    itemId: string,
    versao: number,
    action: "update" | "delete",
    oldVals: { pt: number; pd: number; rh: number },
    newVals: { pt: number; pd: number; rh: number } | null,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("lab_result_history").insert({
      purchase_id: purchase.id,
      purchase_item_id: itemId,
      versao,
      old_pt_ppm: oldVals.pt,
      old_pd_ppm: oldVals.pd,
      old_rh_ppm: oldVals.rh,
      new_pt_ppm: newVals?.pt ?? null,
      new_pd_ppm: newVals?.pd ?? null,
      new_rh_ppm: newVals?.rh ?? null,
      action,
      changed_by: user?.id ?? null,
    });
    await loadHistory();
  };

  const fetchCurrent = async (id: string) => {
    const { data } = await supabase
      .from("lab_results")
      .select("pt_ppm, pd_ppm, rh_ppm")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return { pt: Number(data.pt_ppm) || 0, pd: Number(data.pd_ppm) || 0, rh: Number(data.rh_ppm) || 0 };
  };

  const persistRow = async (loteIdx: number, versao: number) => {
    const lote = lotes[loteIdx];
    const row = lote.rows.find(r => r.versao === versao);
    if (!row) return;

    // If row was cleared, delete existing record
    if (isRowEmpty(row)) {
      if (row.id) {
        setSavingRow(`${lote.itemId}-${versao}`);
        try {
          const prevVals = await fetchCurrent(row.id);
          await supabase.from("lab_results").delete().eq("id", row.id);
          if (prevVals) await logHistory(lote.itemId, versao, "delete", prevVals, null);
          setLotes(prev => prev.map((l, i) => i !== loteIdx ? l : {
            ...l,
            rows: l.rows.map(r => r.versao === versao ? { ...r, id: null } : r),
          }));
        } finally {
          setSavingRow(null);
        }
      }
      return;
    }

    // Only persist when all 3 fields are filled
    if (!isRowFilled(row)) return;

    const pt = parseNum(row.pt);
    const pd = parseNum(row.pd);
    const rh = parseNum(row.rh);

    setSavingRow(`${lote.itemId}-${versao}`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (row.id) {
        const prevVals = await fetchCurrent(row.id);
        const changed = prevVals && (prevVals.pt !== pt || prevVals.pd !== pd || prevVals.rh !== rh);
        await supabase
          .from("lab_results")
          .update({ pt_ppm: pt, pd_ppm: pd, rh_ppm: rh })
          .eq("id", row.id);
        if (changed && prevVals) {
          await logHistory(lote.itemId, versao, "update", prevVals, { pt, pd, rh });
        }
        if (lote.rescued) {
          setLotes(prev => prev.map((l, i) => i !== loteIdx ? l : { ...l, rescued: false }));
        }
      } else {
        const { data, error } = await supabase
          .from("lab_results")
          .insert({
            purchase_id: purchase.id,
            purchase_item_id: lote.itemId,
            pt_ppm: pt,
            pd_ppm: pd,
            rh_ppm: rh,
            versao,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          setLotes(prev => prev.map((l, i) => i !== loteIdx ? l : {
            ...l,
            rows: l.rows.map(r => r.versao === versao ? { ...r, id: data.id } : r),
          }));
        }
      }
    } catch {
      toast.error(`Erro ao salvar análise ${versao}`);
    } finally {
      setSavingRow(null);
    }
  };

  const savedCount = lotes.filter(l => savedRowCount(l) >= 1).length;
  const totalCount = lotes.length;
  const isComplete = totalCount > 0 && savedCount === totalCount;

  const handleFinish = async () => {
    if (!isComplete) {
      toast.error(`Faltam análises: ${savedCount}/${totalCount}`);
      return;
    }
    setSaving(true);
    try {
      await advanceStage(purchase.id, purchase.status);
      toast.success("Análise laboratorial encerrada");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao encerrar");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = lotes.reduce((s, l) => s + l.weight, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Laboratório — Cerâmico
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCount} lotes conferidos</span>
            <span>{fmtNum(totalWeight, 3)} kg total</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum lote conferido encontrado.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Lotes para Análise (até 3 análises por lote — média simples)</p>
            {lotes.map((l, i) => {
              const avg = calcAverage(l);
              const baselineAvg = contestDate ? (baselines[l.itemId] ?? null) : null;
              const nSaved = savedRowCount(l);
              const nFilled = filledRowCount(l);
              const registered = nSaved >= 1;
              const loteHistory = history.filter(h => h.itemId === l.itemId);
              const historyOpen = !!openHistory[l.itemId];
              return (
                <Card key={l.itemId} className={`border-border/50 ${registered ? "bg-green-500/5 border-green-300/50" : ""}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">#{i + 1} — {l.category}</p>
                        <p className="text-xs text-muted-foreground">{fmtNum(l.weight, 3)} kg</p>
                      </div>
                      {registered && (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-500/10 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> {nSaved} análise{nSaved > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>

                    {l.rescued && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Análise carregada do registro anterior — confirme ou altere
                      </p>
                    )}


                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center text-[10px] text-muted-foreground pl-1">
                        <span className="w-16">#</span>
                        <span>Pt (ppm)</span>
                        <span>Pd (ppm)</span>
                        <span>Rh (ppm)</span>
                        <span className="w-4"></span>
                      </div>
                      {l.rows.map(r => {
                        const rowKey = `${l.itemId}-${r.versao}`;
                        const isSaving = savingRow === rowKey;
                        const isSaved = r.id !== null;
                        return (
                          <div key={r.versao} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center">
                            <Label className="text-[11px] w-16 text-muted-foreground">Análise {r.versao}</Label>
                            <Input
                              inputMode="decimal"
                              value={r.pt}
                              onChange={e => updateField(i, r.versao, "pt", e.target.value)}
                              onBlur={() => persistRow(i, r.versao)}
                              placeholder="0,0000"
                              className="h-8 text-sm"
                            />
                            <Input
                              inputMode="decimal"
                              value={r.pd}
                              onChange={e => updateField(i, r.versao, "pd", e.target.value)}
                              onBlur={() => persistRow(i, r.versao)}
                              placeholder="0,0000"
                              className="h-8 text-sm"
                            />
                            <Input
                              inputMode="decimal"
                              value={r.rh}
                              onChange={e => updateField(i, r.versao, "rh", e.target.value)}
                              onBlur={() => persistRow(i, r.versao)}
                              placeholder="0,0000"
                              className="h-8 text-sm"
                            />
                            <div className="w-4 flex items-center justify-center">
                              {isSaving
                                ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                : isSaved
                                  ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  : <span className="h-3 w-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {avg && (
                      baselineAvg ? (
                        <div className="mt-2 space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md border border-border/60 bg-muted/40 p-2">
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                Média inicial{baselineAvg.n > 1 ? ` (${baselineAvg.n} análises)` : ""}
                              </span>
                              <div className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                                <div>Pt: <strong className="text-foreground">{fmtNum(baselineAvg.pt, 4)}</strong></div>
                                <div>Pd: <strong className="text-foreground">{fmtNum(baselineAvg.pd, 4)}</strong></div>
                                <div>Rh: <strong className="text-foreground">{fmtNum(baselineAvg.rh, 4)}</strong></div>
                              </div>
                            </div>
                            <div className="rounded-md border border-orange-300/60 bg-orange-500/10 p-2">
                              <span className="text-[11px] font-semibold text-orange-700">
                                Média da reanálise{nFilled > 1 ? ` (${nFilled} análises)` : ""}
                              </span>
                              <div className="text-xs mt-1 space-y-0.5">
                                <div>Pt: <strong>{fmtNum(avg.pt, 4)}</strong></div>
                                <div>Pd: <strong>{fmtNum(avg.pd, 4)}</strong></div>
                                <div>Rh: <strong>{fmtNum(avg.rh, 4)}</strong></div>
                              </div>
                            </div>
                          </div>
                          {(() => {
                            const d = {
                              pt: avg.pt - baselineAvg.pt,
                              pd: avg.pd - baselineAvg.pd,
                              rh: avg.rh - baselineAvg.rh,
                            };
                            const unchanged = Math.abs(d.pt) < 0.0001 && Math.abs(d.pd) < 0.0001 && Math.abs(d.rh) < 0.0001;
                            if (unchanged) {
                              return <p className="text-[10px] text-muted-foreground text-center">Sem alteração em relação à análise inicial</p>;
                            }
                            const cls = (v: number) => v > 0 ? "text-green-600" : v < 0 ? "text-destructive" : "text-muted-foreground";
                            const sig = (v: number) => `${v > 0 ? "+" : ""}${fmtNum(v, 4)}`;
                            return (
                              <p className="text-[10px] text-center flex justify-center gap-3">
                                <span className={cls(d.pt)}>Δ Pt {sig(d.pt)}</span>
                                <span className={cls(d.pd)}>Δ Pd {sig(d.pd)}</span>
                                <span className={cls(d.rh)}>Δ Rh {sig(d.rh)}</span>
                              </p>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold">Média{nFilled > 1 ? ` (${nFilled} análises)` : ""}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <span>Pt: <strong>{fmtNum(avg.pt, 4)}</strong></span>
                            <span>Pd: <strong>{fmtNum(avg.pd, 4)}</strong></span>
                            <span>Rh: <strong>{fmtNum(avg.rh, 4)}</strong></span>
                          </div>
                        </div>
                      )
                    )}

                    {loteHistory.length > 0 && (
                      <div className="rounded-md border border-border/60 bg-muted/30 mt-2">
                        <button
                          type="button"
                          onClick={() => setOpenHistory(prev => ({ ...prev, [l.itemId]: !prev[l.itemId] }))}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold"
                        >
                          <span className="flex items-center gap-1">
                            <HistoryIcon className="h-3 w-3" />
                            Histórico de análises ({loteHistory.length})
                          </span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                        </button>
                        {historyOpen && (
                          <div className="px-2 pb-2 space-y-1.5">
                            {loteHistory.map(h => (
                              <div key={h.id} className="text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">
                                <div className="flex justify-between">
                                  <span className="font-medium text-foreground">Análise {h.versao}</span>
                                  <span>{new Date(h.at).toLocaleString("pt-BR")}</span>
                                </div>
                                <div>
                                  <span className="line-through">
                                    Pt {fmtNum(h.oldPt ?? 0, 0)} · Pd {fmtNum(h.oldPd ?? 0, 0)} · Rh {fmtNum(h.oldRh ?? 0, 0)}
                                  </span>
                                  {" → "}
                                  {h.action === "delete" ? (
                                    <span className="text-destructive font-medium">removida</span>
                                  ) : (
                                    <span className="text-foreground font-medium">
                                      Pt {fmtNum(h.newPt ?? 0, 0)} · Pd {fmtNum(h.newPd ?? 0, 0)} · Rh {fmtNum(h.newRh ?? 0, 0)}
                                    </span>
                                  )}
                                </div>
                                {h.by && names[h.by] && <div>por {names[h.by]}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border/40">

          <div className="flex items-center gap-2">
            <Progress value={totalCount > 0 ? (savedCount / totalCount) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {savedCount}/{totalCount} lotes
            </span>
          </div>
          {!isComplete && savedCount > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Registre ao menos 1 análise em cada lote para encerrar
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              <Save className="h-3 w-3 mr-1" />
              Salvar e Continuar
            </Button>
            <Button className="flex-1" onClick={handleFinish} disabled={saving || !isComplete}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar ({savedCount}/{totalCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
