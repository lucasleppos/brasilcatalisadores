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

interface LabPiece {
  itemId: string;
  code: string;
  catalogPartName: string | null;
  weight: number;
  // Lab result fields
  labResultId: string | null;
  ptPpm: string;
  pdPpm: string;
  rhPpm: string;
  saved: boolean;
}

interface SacolaLabPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaLabPanel({ purchase, open, onOpenChange, onCompleted }: SacolaLabPanelProps) {
  const [pieces, setPieces] = useState<LabPiece[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPieces, setLoadingPieces] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadPieces();
  }, [open, purchase.id]);

  const loadPieces = async () => {
    setLoadingPieces(true);
    try {
      // Load conferencia items
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, catalog_part_id, category")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "peca_sacola")
        .eq("category", "conferencia");

      if (!items || items.length === 0) {
        setPieces([]);
        setLoadingPieces(false);
        return;
      }

      // Fetch catalog info
      const catalogIds = items.filter(d => d.catalog_part_id).map(d => d.catalog_part_id!);
      let catalogMap: Record<string, { code: string; reference: string }> = {};
      if (catalogIds.length > 0) {
        const { data: parts } = await supabase
          .from("catalog_parts")
          .select("id, code, reference")
          .in("id", catalogIds);
        (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference }; });
      }

      // Fetch existing lab results for this purchase (by purchase_item_id)
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

      setPieces(items.map(item => {
        const cp = item.catalog_part_id ? catalogMap[item.catalog_part_id] : null;
        const lr = labMap[item.id];
        return {
          itemId: item.id,
          code: cp ? cp.code : "Manual",
          catalogPartName: cp ? cp.reference : null,
          weight: Number(item.weight) || 0,
          labResultId: lr?.id || null,
          ptPpm: lr ? String(lr.pt) : "",
          pdPpm: lr ? String(lr.pd) : "",
          rhPpm: lr ? String(lr.rh) : "",
          saved: !!lr,
        };
      }));
    } finally {
      setLoadingPieces(false);
    }
  };

  const updateField = (index: number, field: "ptPpm" | "pdPpm" | "rhPpm", value: string) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, [field]: value, saved: false } : p));
  };

  const handleSavePiece = async (index: number) => {
    const piece = pieces[index];
    const pt = parseFloat(piece.ptPpm.replace(",", "."));
    const pd = parseFloat(piece.pdPpm.replace(",", "."));
    const rh = parseFloat(piece.rhPpm.replace(",", "."));

    if (isNaN(pt) || isNaN(pd) || isNaN(rh)) {
      toast.error("Preencha todos os campos de PPM");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (piece.labResultId) {
        // Update existing
        await supabase
          .from("lab_results")
          .update({ pt_ppm: pt, pd_ppm: pd, rh_ppm: rh })
          .eq("id", piece.labResultId);
      } else {
        // Insert new
        const { data } = await supabase
          .from("lab_results")
          .insert({
            purchase_id: purchase.id,
            purchase_item_id: piece.itemId,
            pt_ppm: pt,
            pd_ppm: pd,
            rh_ppm: rh,
            versao: 1,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();

        if (data) {
          setPieces(prev => prev.map((p, i) => i === index ? { ...p, labResultId: data.id, saved: true } : p));
          toast.success(`Análise #${index + 1} registrada`);
          setSaving(false);
          return;
        }
      }

      setPieces(prev => prev.map((p, i) => i === index ? { ...p, saved: true } : p));
      toast.success(`Análise #${index + 1} salva`);
    } catch {
      toast.error("Erro ao salvar análise");
    } finally {
      setSaving(false);
    }
  };

  const savedCount = pieces.filter(p => p.saved).length;
  const totalCount = pieces.length;
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

  const totalWeight = pieces.reduce((s, p) => s + p.weight, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Laboratório — Peça em Sacola
          </DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCount} peças conferidas</span>
            <span>{fmtNum(totalWeight, 3)} kg total</span>
          </div>
        </div>

        {/* Pieces for analysis */}
        {loadingPieces ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pieces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça conferida encontrada.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Peças para Análise</p>
            {pieces.map((p, i) => (
              <Card key={p.itemId} className={`border-border/50 ${p.saved ? "bg-green-500/5 border-green-300/50" : ""}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-mono">#{i + 1} — {p.code}</p>
                      {p.catalogPartName && (
                        <p className="text-xs text-muted-foreground">{p.catalogPartName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{fmtNum(p.weight, 3)} kg</p>
                    </div>
                    {p.saved && (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-500/10 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Registrada
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Pt (ppm)</Label>
                      <Input
                        inputMode="decimal"
                        value={p.ptPpm}
                        onChange={e => updateField(i, "ptPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Pd (ppm)</Label>
                      <Input
                        inputMode="decimal"
                        value={p.pdPpm}
                        onChange={e => updateField(i, "pdPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Rh (ppm)</Label>
                      <Input
                        inputMode="decimal"
                        value={p.rhPpm}
                        onChange={e => updateField(i, "rhPpm", e.target.value.replace(/[^0-9.,]/g, ""))}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {!p.saved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      disabled={saving || !p.ptPpm || !p.pdPpm || !p.rhPpm}
                      onClick={() => handleSavePiece(i)}
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Salvar Análise
                    </Button>
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
