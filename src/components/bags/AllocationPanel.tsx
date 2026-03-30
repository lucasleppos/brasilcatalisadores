import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bag, allocateItem, isNearLimit, isOverWeight } from "@/lib/bags";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, ArrowRight, Clock } from "lucide-react";

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

interface InProcessMaterial {
  purchaseId: string;
  supplierName: string;
  itemType: string;
  weight: number;
  value: number;
  status: string;
}

const statusColors: Record<string, string> = {
  "Amostragem": "bg-blue-100 text-blue-800",
  "Análise": "bg-purple-100 text-purple-800",
  "Aprovação do Fornecedor": "bg-amber-100 text-amber-800",
  "Pagamento": "bg-emerald-100 text-emerald-800",
};

interface AllocationPanelProps {
  bags: Bag[];
  onAllocated: () => void;
}

export function AllocationPanel({ bags, onAllocated }: AllocationPanelProps) {
  const { toast } = useToast();
  const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
  const [inProcessMaterials, setInProcessMaterials] = useState<InProcessMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocate dialog state
  const [allocatingMaterial, setAllocatingMaterial] = useState<AvailableMaterial | null>(null);
  const [selectedBagId, setSelectedBagId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showWeightWarning, setShowWeightWarning] = useState(false);

  const openBags = bags.filter(b => b.status === "Aberto");
  const selectedBag = bags.find(b => b.id === selectedBagId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAvailableMaterials(), loadInProcessMaterials()]);
    setLoading(false);
  };

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
    if (purchases.length === 0) { setAvailableMaterials([]); return; }

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

    const available: AvailableMaterial[] = [];
    (items || []).forEach((item: any) => {
      if (allocatedIds.has(item.id)) return;
      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;

      const result = item.calc_result as any;
      const input = item.calc_input as any;
      available.push({
        purchaseId: item.purchase_id,
        purchaseItemId: item.id,
        supplierName: purchase.supplier_name,
        weight: Number(item.weight) || (result?.netWeightKg || 0),
        paidValue: Number(item.total_value) || (result?.finalValueBrl || 0),
        ptPpm: input?.ptPpm || 0,
        pdPpm: input?.pdPpm || 0,
        rhPpm: input?.rhPpm || 0,
        itemType: item.item_type,
      });
    });

    setAvailableMaterials(available);
  };

  const loadInProcessMaterials = async () => {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id, supplier_name, status, total_brl")
      .eq("location", "matriz")
      .in("status", ["Amostragem", "Análise", "Aprovação do Fornecedor", "Pagamento"]);

    if (!purchases) { setInProcessMaterials([]); return; }

    const purchaseIds = purchases.map(p => p.id);
    if (purchaseIds.length === 0) { setInProcessMaterials([]); return; }

    const { data: items } = await supabase
      .from("purchase_items")
      .select("*")
      .in("purchase_id", purchaseIds);

    const result: InProcessMaterial[] = [];
    (items || []).forEach((item: any) => {
      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;
      const calcResult = item.calc_result as any;
      result.push({
        purchaseId: item.purchase_id,
        supplierName: purchase.supplier_name,
        itemType: item.item_type,
        weight: Number(item.weight) || (calcResult?.netWeightKg || 0),
        value: Number(item.total_value) || (calcResult?.finalValueBrl || 0),
        status: purchase.status,
      });
    });

    setInProcessMaterials(result);
  };

  const handleAllocateClick = (material: AvailableMaterial) => {
    setAllocatingMaterial(material);
    setSelectedBagId("");
  };

  const handleConfirmAllocate = async () => {
    if (!allocatingMaterial || !selectedBag) return;

    if (isOverWeight(selectedBag, allocatingMaterial.weight)) {
      toast({ title: "Peso ultrapassa o limite de 5% acima do máximo!", variant: "destructive" });
      return;
    }
    if (isNearLimit(selectedBag, allocatingMaterial.weight)) {
      setShowWeightWarning(true);
      return;
    }

    await doAllocate();
  };

  const doAllocate = async () => {
    if (!allocatingMaterial || !selectedBag) return;
    setSaving(true);
    await allocateItem({
      bagId: selectedBag.id,
      purchaseId: allocatingMaterial.purchaseId,
      purchaseItemId: allocatingMaterial.purchaseItemId,
      weight: allocatingMaterial.weight,
      paidValue: allocatingMaterial.paidValue,
      estimatedPtPpm: allocatingMaterial.ptPpm,
      estimatedPdPpm: allocatingMaterial.pdPpm,
      estimatedRhPpm: allocatingMaterial.rhPpm,
      supplierName: allocatingMaterial.supplierName,
    });
    setSaving(false);
    toast({ title: "Material alocado com sucesso" });
    setAllocatingMaterial(null);
    onAllocated();
    loadAvailableMaterials();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando materiais...</p>;
  }

  const totalAvailableKg = availableMaterials.reduce((sum, m) => sum + m.weight, 0);
  const totalAvailableValue = availableMaterials.reduce((sum, m) => sum + m.paidValue, 0);
  const totalInProcessKg = inProcessMaterials.reduce((sum, m) => sum + m.weight, 0);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Lotes Disponíveis</p>
          <p className="text-2xl font-bold">{availableMaterials.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Peso Disponível</p>
          <p className="text-2xl font-bold">{totalAvailableKg.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Valor Disponível</p>
          <p className="text-2xl font-bold">R$ {totalAvailableValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Em Processo (Próximos)</p>
          <p className="text-2xl font-bold">{inProcessMaterials.length} <span className="text-sm font-normal text-muted-foreground">lotes · {totalInProcessKg.toFixed(1)} kg</span></p>
        </div>
      </div>

      {/* Section 1: Available for allocation */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Materiais Disponíveis para Alocação</h2>
          <Badge variant="secondary">{availableMaterials.length}</Badge>
        </div>

        {availableMaterials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material disponível para alocação no momento.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead className="text-right">Pt</TableHead>
                  <TableHead className="text-right">Pd</TableHead>
                  <TableHead className="text-right">Rh</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableMaterials.map((m) => (
                  <TableRow key={m.purchaseItemId}>
                    <TableCell className="font-medium">{m.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.weight.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {m.paidValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{m.ptPpm}</TableCell>
                    <TableCell className="text-right">{m.pdPpm}</TableCell>
                    <TableCell className="text-right">{m.rhPpm}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleAllocateClick(m)}>
                        <ArrowRight className="h-4 w-4 mr-1" /> Alocar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Section 2: In-process materials */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Materiais em Processo (Próximos)</h2>
          <Badge variant="secondary">{inProcessMaterials.length}</Badge>
        </div>

        {inProcessMaterials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material em processo no momento.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inProcessMaterials.map((m, idx) => (
                  <TableRow key={`${m.purchaseId}-${idx}`}>
                    <TableCell className="font-medium">{m.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.weight.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {m.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[m.status] || "bg-muted text-muted-foreground"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Allocate Dialog - simplified, material pre-selected */}
      <Dialog open={!!allocatingMaterial} onOpenChange={(open) => { if (!open) setAllocatingMaterial(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alocar ao Bag</DialogTitle>
          </DialogHeader>
          {allocatingMaterial && (
            <div className="space-y-4">
              <div className="text-sm p-3 rounded-md bg-muted space-y-1">
                <div>Fornecedor: <strong>{allocatingMaterial.supplierName}</strong></div>
                <div>Peso: <strong>{allocatingMaterial.weight.toFixed(2)} kg</strong></div>
                <div>Valor: <strong>R$ {allocatingMaterial.paidValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
                <div>PPMs: Pt {allocatingMaterial.ptPpm} | Pd {allocatingMaterial.pdPpm} | Rh {allocatingMaterial.rhPpm}</div>
              </div>

              <div>
                <label className="text-sm font-medium">Bag Destino</label>
                <Select value={selectedBagId} onValueChange={setSelectedBagId}>
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

              {selectedBag && (
                <div className="text-xs text-muted-foreground">
                  Peso após alocação: {(selectedBag.totalWeight + allocatingMaterial.weight).toFixed(1)} / {selectedBag.maxWeight} kg
                  {isNearLimit(selectedBag, allocatingMaterial.weight) && (
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800">Acima do limite</Badge>
                  )}
                  {isOverWeight(selectedBag, allocatingMaterial.weight) && (
                    <Badge className="ml-2 bg-destructive text-destructive-foreground">Excede margem de 5%</Badge>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocatingMaterial(null)}>Cancelar</Button>
            <Button onClick={handleConfirmAllocate} disabled={!selectedBagId || saving}>
              {saving ? "Alocando..." : "Alocar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weight warning */}
      <AlertDialog open={showWeightWarning} onOpenChange={setShowWeightWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção: Peso acima do limite</AlertDialogTitle>
            <AlertDialogDescription>
              O bag ficará com {selectedBag && allocatingMaterial ? (selectedBag.totalWeight + allocatingMaterial.weight).toFixed(1) : "?"} kg,
              ultrapassando o limite de {selectedBag?.maxWeight || 1000} kg. Deseja continuar?
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
    </div>
  );
}
