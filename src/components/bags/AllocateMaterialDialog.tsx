import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bag, allocateItem, isNearLimit, isOverWeight, getMaterialTypeLabel } from "@/lib/bags";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AvailableMaterial {
  purchaseId: string;
  purchaseItemId: string;
  supplierName: string;
  weight: number;
  paidValue: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  itemType: string;
}

interface AllocateMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bags: Bag[];
  onAllocated: () => void;
}

export function AllocateMaterialDialog({ open, onOpenChange, bags, onAllocated }: AllocateMaterialDialogProps) {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<AvailableMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedBag, setSelectedBag] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showWeightWarning, setShowWeightWarning] = useState(false);

  useEffect(() => {
    if (open) loadAvailableMaterials();
  }, [open]);

  const loadAvailableMaterials = async () => {
    // Get purchases that are in "Enviado ao Bag" or later status, at matriz, and not yet allocated
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id, supplier_name, total_brl, location")
      .eq("location", "matriz")
      .in("status", ["Enviado ao Bag", "Exportação/Venda"]);

    if (!purchases) return;

    const purchaseIds = purchases.map(p => p.id);
    if (purchaseIds.length === 0) { setMaterials([]); return; }

    const { data: items } = await supabase
      .from("purchase_items")
      .select("*")
      .in("purchase_id", purchaseIds);

    // Get already allocated items
    const { data: allocated } = await supabase
      .from("bag_items")
      .select("purchase_item_id")
      .in("purchase_id", purchaseIds);

    const allocatedIds = new Set((allocated || []).map((a: any) => a.purchase_item_id));

    const available: AvailableMaterial[] = [];
    (items || []).forEach((item: any) => {
      if (allocatedIds.has(item.id)) return;
      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;

      const result = item.calc_result as any;
      available.push({
        purchaseId: item.purchase_id,
        purchaseItemId: item.id,
        supplierName: purchase.supplier_name,
        weight: Number(item.weight) || (result?.netWeightKg || 0),
        paidValue: Number(item.total_value) || (result?.finalValueBrl || 0),
        ptPpm: result?.ptContentG ? 0 : 0, // PPMs from input
        pdPpm: 0,
        rhPpm: 0,
        itemType: item.item_type,
      });

      // Extract PPMs from calc_input if available
      const input = item.calc_input as any;
      if (input) {
        available[available.length - 1].ptPpm = input.ptPpm || 0;
        available[available.length - 1].pdPpm = input.pdPpm || 0;
        available[available.length - 1].rhPpm = input.rhPpm || 0;
      }
    });

    setMaterials(available);
  };

  const material = materials.find(m => m.purchaseItemId === selectedMaterial);
  const bag = bags.find(b => b.id === selectedBag);
  const openBags = bags.filter(b => b.status === "Aberto");

  const handleAllocate = async () => {
    if (!material || !bag) return;

    // Weight check
    if (isOverWeight(bag, material.weight)) {
      toast({ title: "Peso ultrapassa o limite de 5% acima do máximo!", variant: "destructive" });
      return;
    }
    if (isNearLimit(bag, material.weight)) {
      setShowWeightWarning(true);
      return;
    }

    await doAllocate();
  };

  const doAllocate = async () => {
    if (!material || !bag) return;
    setSaving(true);
    await allocateItem({
      bagId: bag.id,
      purchaseId: material.purchaseId,
      purchaseItemId: material.purchaseItemId,
      weight: material.weight,
      paidValue: material.paidValue,
      estimatedPtPpm: material.ptPpm,
      estimatedPdPpm: material.pdPpm,
      estimatedRhPpm: material.rhPpm,
      supplierName: material.supplierName,
    });
    setSaving(false);
    toast({ title: "Material alocado com sucesso" });
    setSelectedMaterial("");
    onAllocated();
    loadAvailableMaterials();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alocar Material ao Bag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Disponível</Label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger><SelectValue placeholder="Selecione um material..." /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.purchaseItemId} value={m.purchaseItemId}>
                      {m.supplierName} — {m.weight.toFixed(1)}kg — R$ {m.paidValue.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {materials.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Nenhum material disponível para alocação.</p>
              )}
            </div>

            {material && (
              <div className="text-sm p-3 rounded-md bg-muted space-y-1">
                <div>Fornecedor: <strong>{material.supplierName}</strong></div>
                <div>Peso: <strong>{material.weight.toFixed(2)} kg</strong></div>
                <div>Valor: <strong>R$ {material.paidValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
                <div>PPMs: Pt {material.ptPpm} | Pd {material.pdPpm} | Rh {material.rhPpm}</div>
              </div>
            )}

            <div>
              <Label>Bag Destino</Label>
              <Select value={selectedBag} onValueChange={setSelectedBag}>
                <SelectTrigger><SelectValue placeholder="Selecione um bag..." /></SelectTrigger>
                <SelectContent>
                  {openBags.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bagNumber} — {b.bagLabel} ({b.totalWeight.toFixed(0)}/{b.maxWeight}kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bag && material && (
              <div className="text-xs text-muted-foreground">
                Peso após alocação: {(bag.totalWeight + material.weight).toFixed(1)} / {bag.maxWeight} kg
                {isNearLimit(bag, material.weight) && (
                  <Badge className="ml-2 bg-yellow-100 text-yellow-800">Acima do limite</Badge>
                )}
                {isOverWeight(bag, material.weight) && (
                  <Badge className="ml-2 bg-destructive text-destructive-foreground">Excede margem de 5%</Badge>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleAllocate} disabled={!selectedMaterial || !selectedBag || saving}>
              {saving ? "Alocando..." : "Alocar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWeightWarning} onOpenChange={setShowWeightWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: Peso acima do limite</AlertDialogTitle>
            <AlertDialogDescription>
              O bag ficará com {bag && material ? (bag.totalWeight + material.weight).toFixed(1) : "?"} kg,
              ultrapassando o limite de {bag?.maxWeight || 1000} kg. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowWeightWarning(false); doAllocate(); }}>
              Confirmar Alocação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
