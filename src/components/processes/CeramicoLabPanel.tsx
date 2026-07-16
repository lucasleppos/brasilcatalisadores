import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Save, Loader2, AlertTriangle, FlaskConical } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, parseNum } from "@/lib/utils";

interface AnalysisRow {
  id: string | null; // lab_results.id if persisted
  versao: number; // 1, 2, or 3
  pt: string;
  pd: string;
  rh: string;
}

interface LabLote {
  itemId: string;
  category: string;
  weight: number;
  rows: AnalysisRow[]; // exactly 3 slots
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

interface CeramicoLabPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoLabPanel({ purchase, open, onOpenChange, onCompleted }: CeramicoLabPanelProps) {
  const [lotes, setLotes] = useState<LabLote[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null); // "itemId-versao"

  useEffect(() => {
    if (!open) return;
    loadLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const loadLotes = async () => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, weight_loss, category")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia");

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
        .select("id, purchase_item_id, versao, pt_ppm, pd_ppm, rh_ppm")
        .eq("purchase_id", purchase.id)
        .not("purchase_item_id", "is", null)
        .order("versao", { ascending: true });

      const byItem: Record<string, AnalysisRow[]> = {};
      (labResults || []).forEach(lr => {
        if (!lr.purchase_item_id) return;
        const v = Number(lr.versao) || 1;
        if (v < 1 || v > 3) return;
        (byItem[lr.purchase_item_id] ||= []).push({
          id: lr.id,
          versao: v,
          pt: String(lr.pt_ppm ?? ""),
          pd: String(lr.pd_ppm ?? ""),
          rh: String(lr.rh_ppm ?? ""),
        });
      });

      setLotes(items.map(item => {
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
        };
      }));
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

  const persistRow = async (loteIdx: number, versao: number) => {
    const lote = lotes[loteIdx];
    const row = lote.rows.find(r => r.versao === versao);
    if (!row) return;

    // If row was cleared, delete existing record
    if (isRowEmpty(row)) {
      if (row.id) {
        setSavingRow(`${lote.itemId}-${versao}`);
        try {
          await supabase.from("lab_results").delete().eq("id", row.id);
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
        await supabase
          .from("lab_results")
          .update({ pt_ppm: pt, pd_ppm: pd, rh_ppm: rh })
          .eq("id", row.id);
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
              const nSaved = savedRowCount(l);
              const nFilled = filledRowCount(l);
              const registered = nSaved >= 1;
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
