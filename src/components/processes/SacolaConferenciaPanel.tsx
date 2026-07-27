import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, CheckCircle2, Save, Loader2, AlertTriangle, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum } from "@/lib/utils";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";

interface ConferenciaPiece {
  id?: string;
  code: string;
  reference: string | null;
  catalogPartId: string;
  unitWeight: number;
  quantity: number;
}

interface SacolaConferenciaPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: SacolaConferenciaPanelProps) {
  const [pieces, setPieces] = useState<ConferenciaPiece[]>([]);
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CatalogPart | null>(null);

  const isSacola = purchase.items.some(i => i.itemType === "peca_sacola");
  const itemType: "peca" | "peca_sacola" = isSacola ? "peca_sacola" : "peca";

  useEffect(() => {
    if (!open) return;
    loadExistingPieces();
  }, [open, purchase.id]);

  const loadExistingPieces = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, item_type, weight, quantity, catalog_part_id, category")
      .eq("purchase_id", purchase.id)
      .eq("item_type", itemType)
      .eq("category", "conferencia");

    const rows = (data || []).filter(d => d.catalog_part_id);
    if (rows.length === 0) {
      setPieces([]);
      return;
    }

    const catalogIds = rows.map(d => d.catalog_part_id!);
    const catalogMap: Record<string, { code: string; reference: string }> = {};
    const { data: parts } = await supabase
      .from("catalog_parts")
      .select("id, code, reference")
      .in("id", catalogIds);
    (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference }; });

    setPieces(rows.map(d => {
      const q = Math.max(1, Number(d.quantity) || 1);
      const info = catalogMap[d.catalog_part_id!];
      return {
        id: d.id,
        code: info?.code || "",
        reference: info?.reference || null,
        catalogPartId: d.catalog_part_id!,
        unitWeight: (Number(d.weight) || 0) / q,
        quantity: q,
      };
    }));
  };

  const handlePartSelect = (part: CatalogPart) => {
    setSelectedPart(part);
    setQty("1");
  };

  const handleAdd = () => {
    if (!selectedPart) { toast.error("Selecione uma peça do catálogo"); return; }
    const q = parseInt(qty, 10);
    if (isNaN(q) || q < 1) { toast.error("Informe a quantidade"); return; }

    setPieces(prev => {
      const idx = prev.findIndex(p => p.catalogPartId === selectedPart.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + q };
        return next;
      }
      return [...prev, {
        code: selectedPart.code || selectedPart.reference,
        reference: selectedPart.reference,
        catalogPartId: selectedPart.id,
        unitWeight: Number(selectedPart.weight) || 0,
        quantity: q,
      }];
    });

    setSelectedPart(null);
    setQty("1");
  };

  const changeQty = (index: number, delta: number) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
  };

  const handleRemove = async (index: number) => {
    const piece = pieces[index];
    if (piece.id) {
      await supabase.from("purchase_items").delete().eq("id", piece.id);
    }
    setPieces(prev => prev.filter((_, i) => i !== index));
  };

  /** Remove todos os itens do fluxo (inclusive o item marcador criado na compra) e grava os conferidos */
  const persistPieces = async () => {
    await supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", purchase.id)
      .in("item_type", ["peca", "peca_sacola"]);

    await supabase.from("purchase_items").insert(
      pieces.map(p => ({
        purchase_id: purchase.id,
        item_type: itemType,
        category: "conferencia",
        quantity: p.quantity,
        weight: p.unitWeight * p.quantity,
        catalog_part_id: p.catalogPartId,
      }))
    );
  };

  const handleSave = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    setSaving(true);
    try {
      await persistPieces();
      toast.success("Conferência salva");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Meta = total de peças declaradas na criação da compra (unidades)
  const declaredQty = purchase.bulkWeight && purchase.bulkWeight > 0
    ? Math.round(purchase.bulkWeight)
    : purchase.items
        .filter(i => i.itemType === "peca" || i.itemType === "peca_sacola")
        .reduce((s, i) => s + (i.quantity || 1), 0);

  const totalQty = pieces.reduce((s, p) => s + p.quantity, 0);
  const totalWeight = pieces.reduce((s, p) => s + p.unitWeight * p.quantity, 0);
  const isComplete = declaredQty > 0 && totalQty === declaredQty;

  const handleFinish = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (!isComplete) {
      toast.error(`Faltam peças: ${totalQty}/${declaredQty} conferidas`);
      return;
    }
    setSaving(true);
    try {
      await persistPieces();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isSacola ? "Conferência — Peça em Sacola" : "Conferência — Peças"}</DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{declaredQty} peças declaradas</span>
            <span>{fmtNum(totalWeight, 3)} kg conferidos</span>
          </div>
        </div>

        {/* Pieces list */}
        {pieces.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Peças Conferidas</p>
            {pieces.map((p, i) => (
              <Card key={p.catalogPartId} className="border-border/50">
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground">#{i + 1}</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Código: </span>
                      <span className="font-mono font-medium">{p.code}</span>
                    </p>
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Referência: <span className="font-mono">{p.reference || "—"}</span></span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Peso unit.: {fmtNum(p.unitWeight, 3)} kg · Total: {fmtNum(p.unitWeight * p.quantity, 3)} kg
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(i, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{p.quantity}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(i, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
              <div className="rounded-md border bg-muted/30 p-2 space-y-0.5 text-xs">
                <p className="flex items-center gap-1 font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Peça selecionada
                </p>
                <p><span className="text-muted-foreground">Código: </span><span className="font-mono">{selectedPart.code || "—"}</span></p>
                <p><span className="text-muted-foreground">Referência: </span><span className="font-mono">{selectedPart.reference || "—"}</span></p>
                <p><span className="text-muted-foreground">Marca/Veículo: </span>{selectedPart.brand} {selectedPart.vehicle}</p>
                <p><span className="text-muted-foreground">Peso catálogo: </span>{fmtNum(selectedPart.weight, 3)} kg</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantidade (un)</Label>
            <Input
              inputMode="numeric"
              value={qty}
              onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="1"
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" variant="secondary" className="w-full" onClick={handleAdd} disabled={!selectedPart || !qty || parseInt(qty, 10) < 1}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Peça
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Somente peças do catálogo podem ser incluídas. O peso é carregado automaticamente do cadastro.
          </p>
        </div>

        {/* Summary + Actions */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{totalQty} peças | {fmtNum(totalWeight, 3)} kg</span>
          </div>

          <div className="flex items-center gap-2">
            <Progress value={declaredQty > 0 ? (totalQty / declaredQty) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {totalQty}/{declaredQty} peças
            </span>
          </div>
          {!isComplete && totalQty > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Confira todas as {declaredQty} peças para encerrar
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleSave} disabled={saving || pieces.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar e Continuar
            </Button>
            <Button className="flex-1" onClick={handleFinish} disabled={saving || !isComplete}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar ({totalQty}/{declaredQty})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
