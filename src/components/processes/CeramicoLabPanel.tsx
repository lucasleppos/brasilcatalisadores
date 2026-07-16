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
import { fmtNum } from "@/lib/utils";

interface LabLote {
  itemId: string;
  category: string;
  weight: number;
  labResultId: string | null;
  ptPpm: string;
  pdPpm: string;
  rhPpm: string;
  saved: boolean;
}

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

  useEffect(() => {
    if (!open) return;
    loadLotes();
  }, [open, purchase.id]);

  const loadLotes = async () => {
    setLoading(true);
    try {
      // Load conferencia items
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

      // Load category info from stage_evidence
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

      // Load existing lab results
      const { data: labResults } = await supabase
        .from("lab_results")
        .select("id, purchase_item_id, pt_ppm, pd_ppm, rh_ppm")
        .eq("purchase_id", purchase.id)
        .not("purchase_item_id", "is", null);

      const labMap: Record<string, { id: string; pt: number; pd: number; rh: number }> = {};
      (labResults || []).forEach(lr => {
        if (lr.purchase_item_id) {
          labMap[lr.purchase_item_id] = {
            id: lr.id,
            pt: Number(lr.pt_ppm) || 0,
            pd: Number(lr.pd_ppm) || 0,
            rh: Number(lr.rh_ppm) || 0,
          };
        }
      });

      setLotes(items.map(item => {
        const lr = labMap[item.id];
        return {
          itemId: item.id,
          category: catMap[item.id] || "Lote",
          weight: Number(item.weight) || 0,
          labResultId: lr?.id || null,
          ptPpm: lr ? String(lr.pt) : "",
          pdPpm: lr ? String(lr.pd) : "",
          rhPpm: lr ? String(lr.rh) : "",
          saved: !!lr,
        };
      }));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (index: number, field: "ptPpm" | "pdPpm" | "rhPpm", value: string) => {
    setLotes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value, saved: false } : l));
  };

  const handleSaveLote = async (index: number) => {
    const lote = lotes[index];
    const pt = parseFloat(lote.ptPpm.replace(",", "."));
    const pd = parseFloat(lote.pdPpm.replace(",", "."));
    const rh = parseFloat(lote.rhPpm.replace(",", "."));

    if (isNaN(pt) || isNaN(pd) || isNaN(rh)) {
      toast.error("Preencha todos os campos de PPM");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (lote.labResultId) {
        await supabase
          .from("lab_results")
          .update({ pt_ppm: pt, pd_ppm: pd, rh_ppm: rh })
          .eq("id", lote.labResultId);
      } else {
        const { data } = await supabase
          .from("lab_results")
          .insert({
            purchase_id: purchase.id,
            purchase_item_id: lote.itemId,
            pt_ppm: pt,
            pd_ppm: pd,
            rh_ppm: rh,
            versao: 1,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();

        if (data) {
          setLotes(prev => prev.map((l, i) => i === index ? { ...l, labResultId: data.id, saved: true } : l));
          toast.success(`Análise #${index + 1} registrada`);
          setSaving(false);
          return;
        }
      }

      setLotes(prev => prev.map((l, i) => i === index ? { ...l, saved: true } : l));
      toast.success(`Análise #${index + 1} salva`);
    } catch {
      toast.error("Erro ao salvar análise");
    } finally {
      setSaving(false);
    }
  };

  const savedCount = lotes.filter(l => l.saved).length;
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Laboratório — Cerâmico
          </DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
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

        {/* Lotes for analysis */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum lote conferido encontrado.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Lotes para Análise</p>
            {lotes.map((l, i) => (
              <Card key={l.itemId} className={`border-border/50 ${l.saved ? "bg-green-500/5 border-green-300/50" : ""}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">#{i + 1} — {l.category}</p>
                      <p className="text-xs text-muted-foreground">{fmtNum(l.weight, 3)} kg</p>
                    </div>
                    {l.saved && (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-500/10 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Registrada
                      </Badge>
                    )}
                  </div>

                  {l.saved ? (
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Pt: {l.ptPpm}</span>
                      <span>Pd: {l.pdPpm}</span>
                      <span>Rh: {l.rhPpm}</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Pt (ppm)</Label>
                          <Input
                            inputMode="decimal"
                            value={l.ptPpm}
                            onChange={e => updateField(i, "ptPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Pd (ppm)</Label>
                          <Input
                            inputMode="decimal"
                            value={l.pdPpm}
                            onChange={e => updateField(i, "pdPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Rh (ppm)</Label>
                          <Input
                            inputMode="decimal"
                            value={l.rhPpm}
                            onChange={e => updateField(i, "rhPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        disabled={saving || !l.ptPpm || !l.pdPpm || !l.rhPpm}
                        onClick={() => handleSaveLote(i)}
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                        Salvar Análise
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary + Actions */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Progress value={totalCount > 0 ? (savedCount / totalCount) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {savedCount}/{totalCount} análises
            </span>
          </div>
          {!isComplete && savedCount > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Registre todas as {totalCount} análises para encerrar
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
