import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bag, allocateItem, isNearLimit, isOverWeight } from "@/lib/bags";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { syncCeramicoAllocation, getRealWeightFractionsByPurchase } from "@/lib/purchases";
import { fmtNum, fmtKg, fmtBrl } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AvailableMaterial {
  purchaseId: string;
  purchaseNumber: string;
  purchaseItemId: string;
  supplierName: string;
  supplierBranch?: string;
  weight: number;
  isRealWeight?: boolean;
  paidValue: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  itemType: string;
  carbono?: boolean;
  /** fração de peças pós-trituração (Flex/Carbono) */
  fraction?: "flex" | "carbono";
}


interface InProcessMaterial {
  purchaseId: string;
  purchaseNumber: string;
  supplierName: string;
  supplierBranch?: string;
  itemType: string;
  weight: number;
  value: number;
  status: string;
}

interface AllocatedMaterial {
  purchaseId: string;
  purchaseNumber: string;
  purchaseItemId: string;
  supplierName: string;
  supplierBranch?: string;
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

function sortByPurchaseNumber<T extends { purchaseNumber: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.purchaseNumber.localeCompare(b.purchaseNumber));
}

/** Filial cadastrada no fornecedor, por supplier_id */
async function loadSupplierBranches(supplierIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = [...new Set(supplierIds.filter(Boolean) as string[])];
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("suppliers").select("id, branch").in("id", ids);
  return new Map((data || []).map((s: any) => [s.id, (s.branch || "").trim()]));
}

/**
 * Peso líquido do lote: nos cerâmicos, `weight` é bruto e `weight_loss` é a tara.
 * No fluxo de peças `weight_loss` representa perda, então nada é descontado.
 */
function netWeightOf(item: any): number {
  const gross = Number(item?.weight) || 0;
  if (item?.item_type !== "ceramico") return gross;
  const tare = Number(item?.weight_loss) || 0;
  return Math.max(0, gross - tare);
}




interface AllocationPanelProps {
  bags: Bag[];
  onAllocated: () => void;
}

export function AllocationPanel({ bags, onAllocated }: AllocationPanelProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
  const [allocatedMaterials, setAllocatedMaterials] = useState<AllocatedMaterial[]>([]);
  const [inProcessMaterials, setInProcessMaterials] = useState<InProcessMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

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
      .select("id, purchase_number, supplier_id, supplier_name, status, op_status")
      .eq("status", "Cerâmico: Aprovado");

    const purchaseIds = (ceramicPurchases || []).map(p => p.id);
    if (purchaseIds.length === 0) { setAllocatedMaterials([]); return; }

    const { data: bagItems } = await supabase
      .from("bag_items")
      .select("purchase_id, purchase_item_id, bag_id, weight, paid_value, supplier_name")
      .in("purchase_id", purchaseIds);

    if (!bagItems || bagItems.length === 0) { setAllocatedMaterials([]); return; }

    const itemIds = bagItems.map((b: any) => String(b.purchase_item_id).split("::")[0]);
    const { data: items } = await supabase
      .from("purchase_items")
      .select("id, item_type")
      .in("id", itemIds);

    const itemsMap = new Map((items || []).map((i: any) => [i.id, i]));
    const branchMap = await loadSupplierBranches((ceramicPurchases || []).map((p: any) => p.supplier_id));


    const allocated: AllocatedMaterial[] = [];
    (bagItems || []).forEach((bi: any) => {
      const bag = bags.find(b => b.id === bi.bag_id);
      const purchase = ceramicPurchases?.find(p => p.id === bi.purchase_id) as any;
      const item = itemsMap.get(String(bi.purchase_item_id).split("::")[0]) as any;
      allocated.push({
        purchaseId: bi.purchase_id,
        purchaseNumber: purchase?.purchase_number || "—",
        purchaseItemId: bi.purchase_item_id,
        supplierName: bi.supplier_name || purchase?.supplier_name || "—",
        supplierBranch: branchMap.get(purchase?.supplier_id) || "",
        weight: Number(bi.weight) || 0,
        paidValue: Number(bi.paid_value) || 0,
        itemType: item?.item_type || "—",
        bagId: bi.bag_id,
        bagNumber: bag?.bagNumber || "—",
        bagLabel: bag?.bagLabel || "",
      });
    });

    setAllocatedMaterials(sortByPurchaseNumber(allocated));
  };

  const loadAvailableMaterials = async () => {
    // Query 1: purchases by direct status
    const { data: directPurchases } = await supabase
      .from("purchases")
      .select("id, purchase_number, supplier_id, supplier_name, total_brl, location")
      .eq("location", "matriz")
      .in("status", ["Enviado ao Bag", "Exportação/Venda", "Peças: Alocado ao Bag"]);

    // Query 2: ceramic purchases in parallel phase
    const { data: ceramicPurchases } = await supabase
      .from("purchases")
      .select("id, purchase_number, supplier_id, supplier_name, total_brl, location")
      .eq("location", "matriz")
      .eq("status", "Cerâmico: Aprovado")
      .eq("op_status", "Alocando Bag");

    const purchases = [...(directPurchases || []), ...(ceramicPurchases || [])] as any[];
    if (purchases.length === 0) { setAvailableMaterials([]); return; }

    const purchaseIds = purchases.map(p => p.id);
    const branchMap = await loadSupplierBranches(purchases.map(p => p.supplier_id));


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

    // Pesos reais pós-trituração (peças), separados em Flex/Carbono — por COMPRA
    const fractions = await getRealWeightFractionsByPurchase(purchaseIds);

    // Zr(%) / Ce(%) do laboratório — apenas informativo (selo "Carbono")
    const { data: labRows } = await supabase
      .from("lab_results")
      .select("purchase_item_id, zr_pct, ce_pct")
      .in("purchase_id", purchaseIds)
      .not("purchase_item_id", "is", null);

    const carbonoIds = new Set<string>();
    const acc: Record<string, { zr: number[]; ce: number[] }> = {};
    (labRows || []).forEach((r: any) => {
      const id = r.purchase_item_id as string | null;
      if (!id) return;
      acc[id] ||= { zr: [], ce: [] };
      if (r.zr_pct != null) acc[id].zr.push(Number(r.zr_pct));
      if (r.ce_pct != null) acc[id].ce.push(Number(r.ce_pct));
    });
    Object.entries(acc).forEach(([id, v]) => {
      if (v.zr.length === 0 || v.ce.length === 0) return;
      const zrAvg = v.zr.reduce((s, n) => s + n, 0) / v.zr.length;
      const ceAvg = v.ce.reduce((s, n) => s + n, 0) / v.ce.length;
      if (ceAvg < 3.5 && zrAvg < 5) carbonoIds.add(id);
    });

    const available: AvailableMaterial[] = [];

    // Compras de peças com pesos Flex/Carbono → agregadas em no máximo 2 linhas por OP
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

      let paidTotal = 0;
      let wSum = 0;
      let ptW = 0, pdW = 0, rhW = 0;
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

      const base = {
        purchaseId: pid,
        purchaseNumber: purchase.purchase_number || "—",
        supplierName: purchase.supplier_name,
        supplierBranch: branchMap.get(purchase.supplier_id) || "",
        ptPpm: wSum > 0 ? ptW / wSum : 0,
        pdPpm: wSum > 0 ? pdW / wSum : 0,
        rhPpm: wSum > 0 ? rhW / wSum : 0,
        itemType: opItems[0].item_type,
      };

      ([["flex", flex], ["carbono", carbono]] as const).forEach(([fraction, weight]) => {
        if (weight <= 0) return;
        const id = `${pid}::${fraction}`;
        if (allocatedIds.has(id)) return;
        available.push({
          ...base,
          purchaseItemId: id,
          weight,
          isRealWeight: true,
          paidValue: total > 0 ? paidTotal * (weight / total) : paidTotal,
          fraction,
          carbono: false,
        });
      });
    });

    (items || []).forEach((item: any) => {
      if (splitPurchaseIds.has(item.purchase_id)) return;
      const purchase = purchases.find(p => p.id === item.purchase_id);
      if (!purchase) return;

      const result = item.calc_result as any;
      const input = item.calc_input as any;
      const paidValue = Number(item.total_value) || (result?.finalValueBrl || 0);

      if (allocatedIds.has(item.id)) return;
      // Peso legado (campo único) é rateado entre os itens da compra pelo peso de catálogo
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
        purchaseNumber: purchase.purchase_number || "—",
        supplierName: purchase.supplier_name,
        supplierBranch: branchMap.get(purchase.supplier_id) || "",
        ptPpm: input?.ptPpm || 0,
        pdPpm: input?.pdPpm || 0,
        rhPpm: input?.rhPpm || 0,
        itemType: item.item_type,
        purchaseItemId: item.id,
        weight: legacyWeight > 0 ? legacyWeight : (Number(item.weight) || (result?.netWeightKg || 0)),
        isRealWeight: legacyWeight > 0,
        paidValue,
        carbono: carbonoIds.has(item.id),
      });
    });


    setAvailableMaterials(sortByPurchaseNumber(available));
  };


  const loadInProcessMaterials = async () => {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("id, purchase_number, supplier_id, supplier_name, status, total_brl")
      .eq("location", "matriz")
      .in("status", ["Amostragem", "Análise", "Aprovação do Fornecedor", "Pagamento"]);

    if (!purchases) { setInProcessMaterials([]); return; }

    const purchaseIds = purchases.map(p => p.id);
    if (purchaseIds.length === 0) { setInProcessMaterials([]); return; }

    const branchMap = await loadSupplierBranches(purchases.map((p: any) => p.supplier_id));

    const { data: items } = await supabase
      .from("purchase_items")
      .select("*")
      .in("purchase_id", purchaseIds);

    const result: InProcessMaterial[] = [];
    (items || []).forEach((item: any) => {
      const purchase = purchases.find(p => p.id === item.purchase_id) as any;
      if (!purchase) return;
      const calcResult = item.calc_result as any;
      result.push({
        purchaseId: item.purchase_id,
        purchaseNumber: purchase.purchase_number || "—",
        supplierName: purchase.supplier_name,
        supplierBranch: branchMap.get(purchase.supplier_id) || "",
        itemType: item.item_type,
        weight: Number(item.weight) || (calcResult?.netWeightKg || 0),
        value: Number(item.total_value) || (calcResult?.finalValueBrl || 0),
        status: purchase.status,
      });
    });

    setInProcessMaterials(sortByPurchaseNumber(result));
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

  // Reset selection when filters change to avoid allocating hidden items
  useEffect(() => {
    setSelectedIds(new Set());
  }, [supplierFilter, branchFilter]);

  // Unique filter options from all loaded materials
  const allSuppliers = [...new Set([
    ...availableMaterials.map(m => m.supplierName),
    ...allocatedMaterials.map(m => m.supplierName),
    ...inProcessMaterials.map(m => m.supplierName),
  ])].sort((a, b) => a.localeCompare(b));

  const allBranches = [...new Set([
    ...availableMaterials.map(m => m.supplierBranch || "—"),
    ...allocatedMaterials.map(m => m.supplierBranch || "—"),
    ...inProcessMaterials.map(m => m.supplierBranch || "—"),
  ])].sort((a, b) => a.localeCompare(b));

  const matchesFilters = (m: { supplierName: string; supplierBranch?: string }) => {
    if (supplierFilter !== "all" && m.supplierName !== supplierFilter) return false;
    if (branchFilter !== "all" && (m.supplierBranch || "—") !== branchFilter) return false;
    return true;
  };

  const filteredAvailable = availableMaterials.filter(matchesFilters);
  const filteredAllocated = allocatedMaterials.filter(matchesFilters);
  const filteredInProcess = inProcessMaterials.filter(matchesFilters);

  const selectedMaterials = filteredAvailable.filter(m => selectedIds.has(m.purchaseItemId));
  const selectedWeight = selectedMaterials.reduce((s, m) => s + m.weight, 0);
  const selectedValue = selectedMaterials.reduce((s, m) => s + m.paidValue, 0);
  const allSelected = filteredAvailable.length > 0 && selectedIds.size === filteredAvailable.length;

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === filteredAvailable.length ? new Set() : new Set(filteredAvailable.map(m => m.purchaseItemId))
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando materiais...</p>;
  }

  const totalAvailableKg = filteredAvailable.reduce((sum, m) => sum + m.weight, 0);
  const totalAvailableValue = filteredAvailable.reduce((sum, m) => sum + m.paidValue, 0);
  const totalInProcessKg = filteredInProcess.reduce((sum, m) => sum + m.weight, 0);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Lotes Disponíveis</p>
          <p className="text-2xl font-bold">{filteredAvailable.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Peso Disponível</p>
          <p className="text-2xl font-bold">{fmtNum(totalAvailableKg, 1)} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Valor Disponível</p>
          <p className="text-2xl font-bold">R$ {fmtNum(totalAvailableValue, 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Em Processo (Próximos)</p>
          <p className="text-2xl font-bold">{filteredInProcess.length} <span className="text-sm font-normal text-muted-foreground">lotes · {fmtNum(totalInProcessKg, 1)} kg</span></p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-8 text-sm w-full sm:w-56">
            <SelectValue placeholder="Todos fornecedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos fornecedores</SelectItem>
            {allSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-8 text-sm w-full sm:w-48">
            <SelectValue placeholder="Todas filiais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas filiais</SelectItem>
            {allBranches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {(supplierFilter !== "all" || branchFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSupplierFilter("all"); setBranchFilter("all"); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Section 1: Available for allocation */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Materiais Disponíveis para Alocação</h2>
          <Badge variant="secondary">{filteredAvailable.length}</Badge>
        </div>

        {filteredAvailable.length === 0 ? (
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
                  {fmtKg(selectedWeight, 1)} · {fmtBrl(selectedValue)}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
                  <Button size="sm" onClick={() => handleAllocateClick(selectedMaterials)}>
                    <ArrowRight className="h-4 w-4 mr-1" /> Alocar selecionados
                  </Button>
                </div>
              </div>
            )}
            {isMobile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                </div>
                {filteredAvailable.map((m) => (
                  <div
                    key={m.purchaseItemId}
                    onClick={() => toggleOne(m.purchaseItemId)}
                    className={cn(
                      "rounded-lg border bg-card p-3 space-y-2 transition-colors",
                      selectedIds.has(m.purchaseItemId) && "bg-muted/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={selectedIds.has(m.purchaseItemId)}
                          onCheckedChange={() => toggleOne(m.purchaseItemId)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Selecionar material"
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{m.purchaseNumber}</p>
                          <p className="font-medium text-sm truncate" title={m.supplierName}>
                            {m.supplierName}
                          </p>
                          {m.supplierBranch && (
                            <p className="text-xs text-muted-foreground truncate">{m.supplierBranch}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">{m.itemType}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span>
                          <span className="text-muted-foreground text-xs">Peso</span>
                          <br />
                          <span className="font-medium">{fmtNum(m.weight, 1)} kg</span>
                          {m.isRealWeight && (
                            <span className="text-[10px] text-muted-foreground ml-0.5">(real)</span>
                          )}
                        </span>
                        <span>
                          <span className="text-muted-foreground text-xs">Pt</span>
                          <br />
                          <span className="font-medium">{fmtNum(m.ptPpm, 0)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground text-xs">Pd</span>
                          <br />
                          <span className="font-medium">{fmtNum(m.pdPpm, 0)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground text-xs">Rh</span>
                          <br />
                          <span className="font-medium">{fmtNum(m.rhPpm, 0)}</span>
                        </span>
                      </div>
                      {m.fraction ? (
                        <Badge variant="secondary" className="shrink-0">{m.fraction === "flex" ? "Flex" : "Carbono"}</Badge>
                      ) : m.carbono ? (
                        <Badge variant="secondary" className="shrink-0">Carbono</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs shrink-0">—</span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); handleAllocateClick([m]); }}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" /> Alocar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
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
                      <TableHead>OP</TableHead>
                      <TableHead className="w-[180px]">Fornecedor</TableHead>
                      <TableHead className="w-[140px]">Filial</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Carbono</TableHead>
                      <TableHead className="text-right">Peso (kg)</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Valor (R$)</TableHead>
                      <TableHead className="text-right">Pt</TableHead>
                      <TableHead className="text-right">Pd</TableHead>
                      <TableHead className="text-right">Rh</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailable.map((m) => (
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
                        <TableCell className="font-mono text-xs">{m.purchaseNumber}</TableCell>
                        <TableCell className="font-medium truncate max-w-[180px]" title={m.supplierName}>
                          {m.supplierName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]" title={m.supplierBranch || ""}>
                          {m.supplierBranch || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.itemType}</Badge>
                        </TableCell>
                        <TableCell>
                          {m.fraction ? (
                            <Badge variant="secondary">{m.fraction === "flex" ? "Flex" : "Carbono"}</Badge>
                          ) : m.carbono ? (
                            <Badge variant="secondary">Carbono</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtNum(m.weight, 1)}
                          {m.isRealWeight && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(real)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {fmtNum(m.paidValue, 2)}
                        </TableCell>
                        <TableCell className="text-right">{fmtNum(m.ptPpm, 0)}</TableCell>
                        <TableCell className="text-right">{fmtNum(m.pdPpm, 0)}</TableCell>
                        <TableCell className="text-right">{fmtNum(m.rhPpm, 0)}</TableCell>
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
            )}
          </>

        )}
      </section>

      {/* Section 1b: Already allocated (still visible until bag closes) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Materiais Alocados</h2>
          <Badge variant="secondary">{filteredAllocated.length}</Badge>
        </div>
        {filteredAllocated.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material alocado no momento.</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filteredAllocated.map((m) => (
              <div key={m.purchaseItemId} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{m.purchaseNumber}</p>
                    <p className="font-medium text-sm truncate" title={m.supplierName}>
                      {m.supplierName}
                    </p>
                    {m.supplierBranch && (
                      <p className="text-xs text-muted-foreground truncate">{m.supplierBranch}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">{m.itemType}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <span className="text-muted-foreground text-xs">Peso</span>
                    <br />
                    <span className="font-medium">{fmtNum(m.weight, 1)} kg</span>
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 shrink-0">
                    {m.bagNumber}{m.bagLabel ? ` — ${m.bagLabel}` : ""}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OP</TableHead>
                  <TableHead className="w-[180px]">Fornecedor</TableHead>
                  <TableHead className="w-[140px]">Filial</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Valor (R$)</TableHead>
                  <TableHead>Bag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllocated.map((m) => (
                  <TableRow key={m.purchaseItemId}>
                    <TableCell className="font-mono text-xs">{m.purchaseNumber}</TableCell>
                    <TableCell className="font-medium truncate max-w-[180px]" title={m.supplierName}>
                      {m.supplierName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]" title={m.supplierBranch || ""}>
                      {m.supplierBranch || "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.itemType}</Badge></TableCell>
                    <TableCell className="text-right">{fmtNum(m.weight, 1)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {fmtNum(m.paidValue, 2)}
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
          <Badge variant="secondary">{filteredInProcess.length}</Badge>
        </div>

        {filteredInProcess.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum material em processo no momento.</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filteredInProcess.map((m, idx) => (
              <div key={`${m.purchaseId}-${idx}`} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{m.purchaseNumber}</p>
                    <p className="font-medium text-sm truncate" title={m.supplierName}>
                      {m.supplierName}
                    </p>
                    {m.supplierBranch && (
                      <p className="text-xs text-muted-foreground truncate">{m.supplierBranch}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">{m.itemType}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <span className="text-muted-foreground text-xs">Peso</span>
                    <br />
                    <span className="font-medium">{fmtNum(m.weight, 1)} kg</span>
                  </span>
                  <Badge className={statusColors[m.status] || "bg-muted text-muted-foreground"}>
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OP</TableHead>
                  <TableHead className="w-[180px]">Fornecedor</TableHead>
                  <TableHead className="w-[140px]">Filial</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Valor (R$)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInProcess.map((m, idx) => (
                  <TableRow key={`${m.purchaseId}-${idx}`}>
                    <TableCell className="font-mono text-xs">{m.purchaseNumber}</TableCell>
                    <TableCell className="font-medium truncate max-w-[180px]" title={m.supplierName}>
                      {m.supplierName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]" title={m.supplierBranch || ""}>
                      {m.supplierBranch || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtNum(m.weight, 1)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {fmtNum(m.value, 2)}
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
                    <span className="shrink-0 font-medium">{fmtKg(m.weight, 2)}</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-1 flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{fmtKg(allocatingWeight, 2)} · {fmtBrl(allocatingValue)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Bag Destino</label>
                <Select value={selectedBagId} onValueChange={setSelectedBagId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um bag..." /></SelectTrigger>
                  <SelectContent>
                    {openBags.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bagNumber} — {b.bagLabel} ({fmtNum(b.totalWeight, 0)}/{fmtNum(b.maxWeight, 0)} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBag && (
                <div className="text-xs text-muted-foreground">
                  Peso após alocação: {fmtNum(selectedBag.totalWeight + allocatingWeight, 1)} / {fmtNum(selectedBag.maxWeight, 1)} kg
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
              O bag ficará com {selectedBag ? fmtNum(selectedBag.totalWeight + allocatingWeight, 1) : "?"} kg,
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
