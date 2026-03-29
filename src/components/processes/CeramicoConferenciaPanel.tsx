import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Save, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum } from "@/lib/utils";

const CERAMICO_CATEGORIES = [
  "Grupo 01", "Grupo 02", "Grupo 03", "Grupo 04", "Grupo 05",
  "Grupo 06", "Grupo 07", "Grupo 08", "Grupo 09", "Grupo 10",
  "Especial", "Extra",
];

interface CeramicoLote {
  id?: string;
  category: string;
  weightNet: number;
  tare: number;
}

interface CeramicoConferenciaPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: CeramicoConferenciaPanelProps) {
  const [lotes, setLotes] = useState<CeramicoLote[]>([]);
  const [category, setCategory] = useState("");
  const [weightNetStr, setWeightNetStr] = useState("");
  const [tareStr, setTareStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadExistingLotes();
  }, [open, purchase.id]);

  const loadExistingLotes = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, weight, weight_loss, category")
      .eq("purchase_id", purchase.id)
      .eq("item_type", "ceramico")
      .eq("category", "conferencia");

    if (!data || data.length === 0) {
      setLotes([]);
      return;
    }

    setLotes(data.map(d => ({
      id: d.id,
      category: d.weight_loss != null ? "" : "", // category stored in a workaround
      weightNet: Number(d.weight) || 0,
      tare: Number(d.weight_loss) || 0, // reuse weight_loss field for tare
    })));

    // Re-load with proper category from stage_evidence or just use weight_loss for tare
    // Actually let's store category info properly
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

    setLotes(data.map(d => ({
      id: d.id,
      category: catMap[d.id] || "",
      weightNet: Number(d.weight) || 0,
      tare: Number(d.weight_loss) || 0,
    })));
  };

  const handleAdd = () => {
    if (!category) { toast.error("Selecione a categoria"); return; }
    const w = parseFloat(weightNetStr.replace(",", "."));
    if (isNaN(w) || w <= 0) { toast.error("Informe o peso líquido"); return; }
    const t = parseFloat(tareStr.replace(",", ".")) || 0;

    setLotes(prev => [...prev, { category, weightNet: w, tare: t }]);
    setCategory("");
    setWeightNetStr("");
    setTareStr("");
  };

  const handleRemove = async (index: number) => {
    const lote = lotes[index];
    if (lote.id) {
      await supabase.from("purchase_items").delete().eq("id", lote.id);
      await supabase.from("stage_evidence").delete()
        .eq("purchase_id", purchase.id)
        .eq("task_key", `lote_cat_${lote.id}`);
    }
    setLotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (lotes.length === 0) { toast.error("Adicione pelo menos um lote"); return; }
    setSaving(true);
    try {
      // Delete old conferencia items
      await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia");

      // Delete old category evidence
      await supabase
        .from("stage_evidence")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("stage", "conferencia_ceramico");

      // Insert all lotes
      const { data: inserted } = await supabase.from("purchase_items").insert(
        lotes.map(l => ({
          purchase_id: purchase.id,
          item_type: "ceramico" as const,
          category: "conferencia",
          quantity: 1,
          weight: l.weightNet,
          weight_loss: l.tare, // reuse weight_loss for tare
        }))
      ).select("id");

      // Save category info as stage evidence
      if (inserted) {
        for (let i = 0; i < inserted.length; i++) {
          await supabase.from("stage_evidence").insert({
            purchase_id: purchase.id,
            stage: "conferencia_ceramico",
            task_key: `lote_cat_${inserted[i].id}`,
            data_type: "text",
            value_text: lotes[i].category,
          });
        }
      }

      toast.success("Conferência salva");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (lotes.length === 0) { toast.error("Adicione pelo menos um lote"); return; }
    setSaving(true);
    try {
      // Save first
      await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia");

      await supabase
        .from("stage_evidence")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("stage", "conferencia_ceramico");

      const { data: inserted } = await supabase.from("purchase_items").insert(
        lotes.map(l => ({
          purchase_id: purchase.id,
          item_type: "ceramico" as const,
          category: "conferencia",
          quantity: 1,
          weight: l.weightNet,
          weight_loss: l.tare,
        }))
      ).select("id");

      if (inserted) {
        for (let i = 0; i < inserted.length; i++) {
          await supabase.from("stage_evidence").insert({
            purchase_id: purchase.id,
            stage: "conferencia_ceramico",
            task_key: `lote_cat_${inserted[i].id}`,
            data_type: "text",
            value_text: lotes[i].category,
          });
        }
      }

      // Advance stage
      await advanceStage(purchase.id, purchase.status);
      toast.success("Conferência encerrada");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao encerrar conferência");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = lotes.reduce((s, l) => s + l.weightNet, 0);
  const declaredWeight = purchase.bulkWeight || 0;
  const progress = declaredWeight > 0 ? Math.min((totalWeight / declaredWeight) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferência — Cerâmico</DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Peso declarado: {fmtNum(declaredWeight, 3)} kg
          </div>
        </div>

        {/* Lotes list */}
        {lotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Lotes Conferidos</p>
            {lotes.map((l, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">#{i + 1} — {l.category}</p>
                    <p className="text-xs text-muted-foreground">
                      Peso Líq: {fmtNum(l.weightNet, 3)} kg | Tara: {fmtNum(l.tare, 3)} kg
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add lote form */}
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Adicionar Lote</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria (Grupo) *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
              <SelectContent>
                {CERAMICO_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Peso Líquido (kg) *</Label>
              <Input
                inputMode="decimal"
                value={weightNetStr}
                onChange={e => setWeightNetStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,000"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tara (kg)</Label>
              <Input
                inputMode="decimal"
                value={tareStr}
                onChange={e => setTareStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,000"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button size="sm" variant="secondary" className="w-full" onClick={handleAdd} disabled={!category}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Lote
          </Button>
        </div>

        {/* Summary + Actions */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{lotes.length} lotes | {fmtNum(totalWeight, 3)} kg</span>
          </div>

          {declaredWeight > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2 flex-1" />
                <span className={`text-xs font-semibold whitespace-nowrap ${totalWeight >= declaredWeight ? "text-green-600" : "text-amber-600"}`}>
                  {fmtNum(totalWeight, 1)}/{fmtNum(declaredWeight, 1)} kg
                </span>
              </div>
              {totalWeight > declaredWeight * 1.05 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Peso dos lotes excede o declarado
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving || lotes.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar e Continuar
            </Button>
            <Button className="flex-1" onClick={handleFinish} disabled={saving || lotes.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar ({lotes.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
