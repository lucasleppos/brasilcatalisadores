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
import { Package, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { syncCeramicoAllocation, getRealWeightsByItem } from "@/lib/purchases";

interface AvailableMaterial {
  purchaseId: string;
  purchaseItemId: string;
  supplierName: string;
  weight: number;
  isRealWeight?: boolean;
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

interface AllocatedMaterial {
  purchaseId: string;
  purchaseItemId: string;
  supplierName: string;
  weight: number;
  paidValue: number;
  itemType: string;
  bagId: string;
  bagNumber: string;
  bagLabel: string;
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
  const [allocatedMaterials, setAllocatedMaterials] = useState<AllocatedMaterial[]>([]);
  const [inProcessMaterials, setInProcessMaterials] = useState<InProcessMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Allocate dialog state
  const [allocatingMaterials, setAllocatingMaterials] = useState<AvailableMaterial[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBagId, setSelectedBagId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showWeightWarning, setShowWeightWarning] = useState(false);

  const openBags = bags.filter(b => b.status === "Aberto");
  const selectedBag = bags.find(b => b.id === selectedBagId);
  const allocatingWeight = allocatingMaterials.reduce((s, m) => s + m.weight, 0);
  const allocatingValue = allocatingMaterials.reduce((s, m) => s + m.paidValue, 0);
  const selectedMaterials = availableMaterials.filter(m => selectedIds.has(m.purchaseItemId));
  const selectedWeight = selectedMaterials.reduce((s, m) => s + m.weight, 0);
  const selectedValue = selectedMaterials.reduce((s, m) => s + m.paidValue, 0);
  const allSelected = availableMaterials.length > 0 && selectedIds.size === availableMaterials.length;

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === availableMaterials.length ? new Set() : new Set(availableMaterials.map(m => m.purchaseItemId))
    );
  };


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAvailableMaterials(), loadAllocatedMaterials(), loadInProcessMaterials()]);
    setLoading(false);
  };

  const loadAllocatedMaterials = async () => {
    // Ceramicos alocados: status=Cerâmico: Aprovado e há bag_items vinculados
    const { data: ceramicPurchases } = await supabase
      .from("purchases")
      .select("id, supplier_name, status, op_status")
      .eq("status", "Cerâmico: Aprovado");

    const purchaseIds = (ceramicPurchases || []).map(p => p.id);
    if (purchaseIds.length === 0) { setAllocatedMaterials([]); return; }

    const { data: bagItems } = await supabase
      .from("bag_items")
      .select("purchase_id, purchase_item_id, bag_id, weight, paid_value, supplier_name")
      .in("purchase_id", purchaseIds);

    if (!bagItems || bagItems.length === 0) { setAllocatedMaterials([]); return; }

    const itemIds = bagItems.map((b: any) => b.purchase_item_id);
    const { data: items } = await supabase
      .from("purchase_items")
      .select("id, item_type")
      .in("id", itemIds);

    const itemsMap = new Map((items || []).map((i: any) => [i.id, i]));

    const allocated: AllocatedMaterial[] = [];
    (bagItems || []).forEach((bi: any) => {
      const bag = bags.find(b => b.id === bi.bag_id);
      const purchase = ceramicPurchases?.find(p => p.id === bi.purchase_id);
      const item = itemsMap.get(bi.purchase_item_id) as any;
      allocated.push({
        purchaseId: bi.purchase_id,
        purchaseItemId: bi.purchase_item_id,
        supplierName: bi.supplier_name || purchase?.supplier_name || "—",
        weight: Number(bi.weight) || 0,
        paidValue: Number(bi.paid_value) || 0,
        itemType: item?.item_type || "—",
        bagId: bi.bag_id,
        bagNumber: bag?.bagNumber || "—",
        bagLabel: bag?.bagLabel || "",
      });
    });

    setAllocatedMaterials(allocated);
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

    // Peso real pós-trituração (peças), rateado por item de conferência
    const realWeights = await getRealWeightsByItem(purchaseIds);

    const available: AvailableMaterial[] = [];
    (items || []).forEach((item: any) => {
      if (allocatedIds.has(item.id)) return;
      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;

      const result = item.calc_result as any;
      const input = item.calc_input as any;
      const realWeight = realWeights.get(item.id);
      available.push({
        purchaseId: item.purchase_id,
        purchaseItemId: item.id,
        supplierName: purchase.supplier_name,
        weight: realWeight != null ? realWeight : (Number(item.weight) || (result?.netWeightKg || 0)),
        isRealWeight: realWeight != null,
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

  const handleAllocateClick = (materials: AvailableMaterial[]) => {
    setAllocatingMaterials(materials);
    setSelectedBagId("");
  };

  const handleConfirmAllocate = async () => {
    if (allocatingMaterials.length === 0 || !selectedBag) return;

    if (isOverWeight(selectedBag, allocatingWeight)) {
      toast({ title: "Peso ultrapassa o limite de 5% acima do máximo!", variant: "destructive" });
      return;
    }
    if (isNearLimit(selectedBag, allocatingWeight)) {
      setShowWeightWarning(true);
      return;
    }

    await doAllocate();
  };

  const doAllocate = async () => {
    if (allocatingMaterials.length === 0 || !selectedBag) return;
    setSaving(true);

    let ok = 0;
    for (const m of allocatingMaterials) {
      const res = await allocateItem({
        bagId: selectedBag.id,
        purchaseId: m.purchaseId,
        purchaseItemId: m.purchaseItemId,
        weight: m.weight,
        paidValue: m.paidValue,
        estimatedPtPpm: m.ptPpm,
        estimatedPdPpm: m.pdPpm,
        estimatedRhPpm: m.rhPpm,
        supplierName: m.supplierName,
      });
      if (res) ok++;
    }

    // Cerâmico: auto-encerra quando todos os grupos da compra estão alocados
    const purchaseIds = [...new Set(allocatingMaterials.map(m => m.purchaseId))];
    for (const pid of purchaseIds) await syncCeramicoAllocation(pid);

    setSaving(false);
    if (ok === allocatingMaterials.length) {
      toast({ title: ok > 1 ? `${ok} materiais alocados com sucesso` : "Material alocado com sucesso" });
    } else {
      toast({ title: `${ok} de ${allocatingMaterials.length} materiais alocados`, variant: "destructive" });
    }

    const allocatedSet = new Set(allocatingMaterials.map(m => m.purchaseItemId));
    setSelectedIds(prev => new Set([...prev].filter(id => !allocatedSet.has(id))));
    setAllocatingMaterials([]);
    onAllocated();
    loadData();
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
          <>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/50 px-4 py-2">
                <p className="text-sm">
                  <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "item selecionado" : "itens selecionados"} ·{" "}
                  {selectedWeight.toFixed(1)} kg · R$ {selectedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
                  <Button size="sm" onClick={() => handleAllocateClick(selectedMaterials)}>
                    <ArrowRight className="h-4 w-4 mr-1" /> Alocar selecionados
                  </Button>
                </div>
              </div>
            )}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
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
                    <TableRow
                      key={m.purchaseItemId}
                      data-state={selectedIds.has(m.purchaseItemId) ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => toggleOne(m.purchaseItemId)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(m.purchaseItemId)}
                          onCheckedChange={() => toggleOne(m.purchaseItemId)}
                          aria-label="Selecionar material"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{m.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.itemType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.weight.toFixed(1)}
                        {m.isRealWeight && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(real)</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {m.paidValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{m.ptPpm}</TableCell>
                      <TableCell className="text-right">{m.pdPpm}</TableCell>
                      <TableCell className="text-right">{m.rhPpm}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => handleAllocateClick([m])}>
                          <ArrowRight className="h-4 w-4 mr-1" /> Alocar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>

        )}
      </section>

      {/* Section 1b: Already allocated (still visible until bag closes) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Materiais Alocados</h2>
          <Badge variant="secondary">{allocatedMaterials.length}</Badge>
        </div>
        {allocatedMaterials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material alocado no momento.</p>
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
                  <TableHead>Bag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedMaterials.map((m) => (
                  <TableRow key={m.purchaseItemId}>
                    <TableCell className="font-medium">{m.supplierName}</TableCell>
                    <TableCell><Badge variant="outline">{m.itemType}</Badge></TableCell>
                    <TableCell className="text-right">{m.weight.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {m.paidValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {m.bagNumber}{m.bagLabel ? ` — ${m.bagLabel}` : ""}
                      </Badge>
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

      {/* Allocate Dialog - suporta 1 ou N materiais */}
      <Dialog open={allocatingMaterials.length > 0} onOpenChange={(open) => { if (!open) setAllocatingMaterials([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {allocatingMaterials.length > 1 ? `Alocar ${allocatingMaterials.length} materiais ao Bag` : "Alocar ao Bag"}
            </DialogTitle>
          </DialogHeader>
          {allocatingMaterials.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm rounded-md bg-muted p-3 space-y-1 max-h-48 overflow-y-auto">
                {allocatingMaterials.map((m) => (
                  <div key={m.purchaseItemId} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.supplierName} · {m.itemType}</span>
                    <span className="shrink-0 font-medium">{m.weight.toFixed(2)} kg</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-1 flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{allocatingWeight.toFixed(2)} kg · R$ {allocatingValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
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
                  Peso após alocação: {(selectedBag.totalWeight + allocatingWeight).toFixed(1)} / {selectedBag.maxWeight} kg
                  {isNearLimit(selectedBag, allocatingWeight) && (
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800">Acima do limite</Badge>
                  )}
                  {isOverWeight(selectedBag, allocatingWeight) && (
                    <Badge className="ml-2 bg-destructive text-destructive-foreground">Excede margem de 5%</Badge>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocatingMaterials([])}>Cancelar</Button>
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
              O bag ficará com {selectedBag ? (selectedBag.totalWeight + allocatingWeight).toFixed(1) : "?"} kg,
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
