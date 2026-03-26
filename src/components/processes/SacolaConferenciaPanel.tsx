import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, CheckCircle2, Save, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum } from "@/lib/utils";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";

interface ConferenciaPiece {
  id?: string;
  code: string;
  catalogPartId: string | null;
  catalogPartName: string | null;
  weight: number;
}

interface SacolaConferenciaPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: SacolaConferenciaPanelProps) {
  const [pieces, setPieces] = useState<ConferenciaPiece[]>([]);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CatalogPart | null>(null);
  const [manualCode, setManualCode] = useState("");

  // Load existing conferência items on open
  useEffect(() => {
    if (!open) return;
    loadExistingPieces();
  }, [open, purchase.id]);

  const loadExistingPieces = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, item_type, weight, catalog_part_id, category")
      .eq("purchase_id", purchase.id)
      .eq("item_type", "peca_sacola")
      .eq("category", "conferencia");

    if (!data || data.length === 0) {
      setPieces([]);
      return;
    }

    // Fetch catalog info for parts
    const catalogIds = data.filter(d => d.catalog_part_id).map(d => d.catalog_part_id!);
    let catalogMap: Record<string, { code: string; reference: string }> = {};
    if (catalogIds.length > 0) {
      const { data: parts } = await supabase
        .from("catalog_parts")
        .select("id, code, reference")
        .in("id", catalogIds);
      (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference }; });
    }

    setPieces(data.map(d => ({
      id: d.id,
      code: d.catalog_part_id && catalogMap[d.catalog_part_id] ? catalogMap[d.catalog_part_id].code : "",
      catalogPartId: d.catalog_part_id,
      catalogPartName: d.catalog_part_id && catalogMap[d.catalog_part_id] ? catalogMap[d.catalog_part_id].reference : null,
      weight: Number(d.weight) || 0,
    })));
  };

  const handlePartSelect = (part: CatalogPart) => {
    setSelectedPart(part);
    setManualCode(part.code || part.reference);
  };

  const handleAdd = () => {
    const w = parseFloat(weight.replace(",", "."));
    const code = selectedPart ? (selectedPart.code || selectedPart.reference) : manualCode.trim();
    if (!code) { toast.error("Informe o código da peça"); return; }
    if (isNaN(w) || w <= 0) { toast.error("Informe o peso líquido"); return; }

    setPieces(prev => [...prev, {
      code,
      catalogPartId: selectedPart?.id || null,
      catalogPartName: selectedPart ? (selectedPart.reference || selectedPart.code) : null,
      weight: w,
    }]);

    setSelectedPart(null);
    setManualCode("");
    setWeight("");
  };

  const handleRemove = async (index: number) => {
    const piece = pieces[index];
    if (piece.id) {
      await supabase.from("purchase_items").delete().eq("id", piece.id);
    }
    setPieces(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    setSaving(true);
    try {
      // Delete old conferencia items
      await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("item_type", "peca_sacola")
        .eq("category", "conferencia");

      // Insert all pieces
      await supabase.from("purchase_items").insert(
        pieces.map(p => ({
          purchase_id: purchase.id,
          item_type: "peca_sacola" as const,
          category: "conferencia",
          quantity: 1,
          weight: p.weight,
          catalog_part_id: p.catalogPartId,
        }))
      );

      toast.success("Conferência salva");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const declaredQty = purchase.items
    .filter(i => i.itemType === "peca_sacola")
    .reduce((s, i) => s + (i.quantity || 1), 0);

  const isComplete = pieces.length === declaredQty;

  const handleFinish = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (!isComplete) {
      toast.error(`Faltam peças: ${pieces.length}/${declaredQty} conferidas`);
      return;
    }
    setSaving(true);
    try {
      // Save first
      await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("item_type", "peca_sacola")
        .eq("category", "conferencia");

      await supabase.from("purchase_items").insert(
        pieces.map(p => ({
          purchase_id: purchase.id,
          item_type: "peca_sacola" as const,
          category: "conferencia",
          quantity: 1,
          weight: p.weight,
          catalog_part_id: p.catalogPartId,
        }))
      );

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

  const totalWeight = pieces.reduce((s, p) => s + p.weight, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferência — Peça em Sacola</DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{purchase.items.reduce((s, i) => s + (i.quantity || 1), 0)} peças declaradas</span>
            <span>{fmtNum(purchase.items.reduce((s, i) => s + (i.weight || 0), 0), 3)} kg</span>
          </div>
        </div>

        {/* Pieces list */}
        {pieces.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Peças Conferidas</p>
            {pieces.map((p, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-mono">#{i + 1} — {p.code}</p>
                    {p.catalogPartName ? (
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {p.catalogPartName}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Não encontrada no catálogo
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{fmtNum(p.weight, 3)} kg</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add piece form */}
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Adicionar Peça</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Buscar peça no catálogo</Label>
            <PartSearch onSelect={handlePartSelect} />
            {selectedPart && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> {selectedPart.reference || selectedPart.code} — {selectedPart.brand} {selectedPart.vehicle}
              </p>
            )}
          </div>
          {!selectedPart && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ou código manual (se não encontrar)</Label>
              <Input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Ex: ABC-123"
                className="h-8 text-sm"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Peso líquido (kg)</Label>
            <Input
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="0,000"
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" variant="secondary" className="w-full" onClick={handleAdd} disabled={!selectedPart && !manualCode.trim()}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Peça
          </Button>
        </div>

        {/* Summary + Actions */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{pieces.length} peças | {fmtNum(totalWeight, 3)} kg</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving || pieces.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar e Continuar
            </Button>
            <Button className="flex-1" onClick={handleFinish} disabled={saving || pieces.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar ({pieces.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
