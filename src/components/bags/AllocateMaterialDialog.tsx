import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bag, allocateItem, isNearLimit, isOverWeight, getMaterialTypeLabel } from "@/lib/bags";
import { syncCeramicoAllocation, getRealWeightFractionsByPurchase } from "@/lib/purchases";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fmtNum, fmtBrl } from "@/lib/utils";

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
  fraction?: "flex" | "carbono";
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
    // Query 1: purchases by direct status
    const { data: directPurchases } = await supabase
      .from("purchases")
      .select("id, supplier_name, total_brl, location")
      .eq("location", "matriz")
      .in("status", ["Enviado ao Bag", "Exportação/Venda", "Peças: Alocado ao Bag"]);

    // Query 2: ceramic purchases in parallel phase
    const { data: ceramicPurchases } = await supabase
      .from("purchases")
      .select("id, supplier_name, total_brl, location")
      .eq("location", "matriz")
      .eq("status", "Cerâmico: Aprovado")
      .eq("op_status", "Alocando Bag");

    const purchases = [...(directPurchases || []), ...(ceramicPurchases || [])];
    if (purchases.length === 0) { setMaterials([]); return; }

    const purchaseIds = purchases.map(p => p.id);

    const { data: items } = await supabase
      .from("purchase_items")
      .select("*")
      .eq("category", "conferencia")
      .in("purchase_id", purchaseIds);

    const { data: allocated } = await supabase
      .from("bag_items")
      .select("purchase_item_id")
      .in("purchase_id", purchaseIds);

    const allocatedIds = new Set((allocated || []).map((a: any) => a.purchase_item_id));

    // Peso real pós-trituração (peças), separado em Flex/Carbono — por compra
    const fractions = await getRealWeightFractionsByPurchase(purchaseIds);

    const available: AvailableMaterial[] = [];

    const splitPurchaseIds = new Set(
      purchaseIds.filter(pid => {
        const f = fractions.get(pid);
        return (f?.flex || 0) > 0 || (f?.carbono || 0) > 0;
      })
    );

    splitPurchaseIds.forEach(pid => {
      const purchase = purchases.find(p => p.id === pid);
      const opItems = (items || []).filter((i: any) => i.purchase_id === pid);
      if (!purchase || opItems.length === 0) return;

      const f = fractions.get(pid)!;
      const flex = f.flex || 0;
      const carbono = f.carbono || 0;
      const total = flex + carbono;

      let paidTotal = 0, wSum = 0, ptW = 0, pdW = 0, rhW = 0;
      opItems.forEach((item: any) => {
        const result = item.calc_result as any;
        const input = item.calc_input as any;
        paidTotal += Number(item.total_value) || (result?.finalValueBrl || 0);
        const w = Number(item.weight) || (result?.netWeightKg || 0) || 1;
        wSum += w;
        ptW += (input?.ptPpm || 0) * w;
        pdW += (input?.pdPpm || 0) * w;
        rhW += (input?.rhPpm || 0) * w;
      });

      ([["flex", flex], ["carbono", carbono]] as const).forEach(([fraction, weight]) => {
        if (weight <= 0) return;
        const id = `${pid}::${fraction}`;
        if (allocatedIds.has(id)) return;
        available.push({
          purchaseId: pid,
          supplierName: purchase.supplier_name,
          ptPpm: wSum > 0 ? ptW / wSum : 0,
          pdPpm: wSum > 0 ? pdW / wSum : 0,
          rhPpm: wSum > 0 ? rhW / wSum : 0,
          itemType: opItems[0].item_type,
          purchaseItemId: id,
          weight,
          paidValue: total > 0 ? paidTotal * (weight / total) : paidTotal,
          fraction,
        });
      });
    });

    // Peça em Sacola → 2 linhas por OP (soma Flex / soma Carbono)
    const sacolaAggIds = new Set(
      (items || [])
        .filter((i: any) => i.item_type === "peca_sacola" && !splitPurchaseIds.has(i.purchase_id))
        .map((i: any) => i.purchase_id as string)
    );

    sacolaAggIds.forEach(pid => {
      const purchase = purchases.find(p => p.id === pid);
      const opItems = (items || []).filter((i: any) => i.purchase_id === pid);
      if (!purchase || opItems.length === 0) return;

      (["flex", "carbono"] as const).forEach(kind => {
        const kindItems = opItems.filter(
          (i: any) => (i.material_kind === "carbono" ? "carbono" : "flex") === kind
        );
        if (kindItems.length === 0) return;
        const id = `${pid}::kind_${kind}`;
        if (allocatedIds.has(id)) return;

        let weight = 0, paid = 0, ptW = 0, pdW = 0, rhW = 0;
        kindItems.forEach((item: any) => {
          const result = item.calc_result as any;
          const input = item.calc_input as any;
          const w = Number(item.weight) || (result?.netWeightKg || 0);
          weight += w;
          paid += Number(item.total_value) || (result?.finalValueBrl || 0);
          ptW += (input?.ptPpm || 0) * w;
          pdW += (input?.pdPpm || 0) * w;
          rhW += (input?.rhPpm || 0) * w;
        });
        if (weight <= 0) return;

        available.push({
          purchaseId: pid,
          supplierName: purchase.supplier_name,
          ptPpm: ptW / weight,
          pdPpm: pdW / weight,
          rhPpm: rhW / weight,
          itemType: kindItems[0].item_type,
          purchaseItemId: id,
          weight,
          paidValue: paid,
          fraction: kind,
        });
      });
    });

    (items || []).forEach((item: any) => {
      if (splitPurchaseIds.has(item.purchase_id)) return;
      if (sacolaAggIds.has(item.purchase_id)) return;

      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;
      if (allocatedIds.has(item.id)) return;

      const result = item.calc_result as any;
      const input = item.calc_input as any;
      const legacyTotal = fractions.get(item.purchase_id)?.legacy || 0;
      let legacyWeight = 0;
      if (legacyTotal > 0) {
        const opItems = (items || []).filter((i: any) => i.purchase_id === item.purchase_id);
        const catalogTotal = opItems.reduce((s: number, i: any) => s + (Number(i.weight) || 0), 0);
        legacyWeight = catalogTotal > 0
          ? legacyTotal * ((Number(item.weight) || 0) / catalogTotal)
          : legacyTotal / opItems.length;
      }

      available.push({
        purchaseId: item.purchase_id,
        supplierName: purchase.supplier_name,
        ptPpm: input?.ptPpm || 0,
        pdPpm: input?.pdPpm || 0,
        rhPpm: input?.rhPpm || 0,
        itemType: item.item_type,
        purchaseItemId: item.id,
        weight: legacyWeight > 0 ? legacyWeight : (Number(item.weight) || (result?.netWeightKg || 0)),
        paidValue: Number(item.total_value) || (result?.finalValueBrl || 0),
      });
    });


    setMaterials(available);
  };

  const material = materials.find(m => m.purchaseItemId === selectedMaterial);
  const bag = bags.find(b => b.id === selectedBag);
  const openBags = bags.filter(b => b.status === "Aberto");

  const handleAllocate = async () => {
    if (!material || !bag) return;

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

    // Cerâmico: auto-encerra quando todos os grupos estão alocados
    await syncCeramicoAllocation(material.purchaseId);

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
                      {m.supplierName}{m.fraction ? ` (${m.fraction === "flex" ? "Flex" : "Carbono"})` : ""} — {fmtNum(m.weight, 4)}kg — {fmtBrl(m.paidValue)}
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
                <div>Peso: <strong>{fmtNum(material.weight, 4)} kg</strong></div>
                <div>Valor: <strong>{fmtBrl(material.paidValue)}</strong></div>
                <div>PPMs: Pt {fmtNum(material.ptPpm, 4)} | Pd {fmtNum(material.pdPpm, 4)} | Rh {fmtNum(material.rhPpm, 4)}</div>
              </div>
            )}

            <div>
              <Label>Bag Destino</Label>
              <Select value={selectedBag} onValueChange={setSelectedBag}>
                <SelectTrigger><SelectValue placeholder="Selecione um bag..." /></SelectTrigger>
                <SelectContent>
                  {openBags.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bagNumber} — {b.bagLabel} ({fmtNum(b.totalWeight, 0)}/{b.maxWeight}kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bag && material && (
              <div className="text-xs text-muted-foreground">
                Peso após alocação: {fmtNum(bag.totalWeight + material.weight, 4)} / {bag.maxWeight} kg
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
              O bag ficará com {bag && material ? fmtNum(bag.totalWeight + material.weight, 4) : "?"} kg,
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
