import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bag, loadBags } from "@/lib/bags";
import { BagCard } from "@/components/bags/BagCard";
import { BagDetail } from "@/components/bags/BagDetail";
import { NewBagDialog } from "@/components/bags/NewBagDialog";
import { AllocationPanel } from "@/components/bags/AllocationPanel";
import { BranchStockList } from "@/components/bags/BranchStockList";
import { BagAnalysisPanel } from "@/components/bags/BagAnalysisPanel";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

export default function BagsPage() {
  const { canDo } = usePermissions();
  const canCreate = canDo("bags", "create");

  const [bags, setBags] = useState<Bag[]>([]);
  const [selectedBag, setSelectedBag] = useState<Bag | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const load = async () => {
    const data = await loadBags();
    setBags(data);
    if (selectedBag) {
      const updated = data.find(b => b.id === selectedBag.id);
      if (updated) setSelectedBag(updated);
      else setSelectedBag(null);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = bags.filter(b => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterType !== "all" && b.materialType !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bags de Exportação</h1>
          <p className="text-muted-foreground text-sm">Gerencie bags, alocação de materiais e análises</p>
        </div>
      </div>

      <Tabs defaultValue="bags">
        <TabsList>
          <TabsTrigger value="bags">Bags</TabsTrigger>
          <TabsTrigger value="alocar">Alocar Material</TabsTrigger>
          <TabsTrigger value="filiais">Estoque Filiais</TabsTrigger>
          <TabsTrigger value="analise">Financeiro & Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="bags" className="space-y-4">
          {selectedBag ? (
            <BagDetail bag={selectedBag} onBack={() => setSelectedBag(null)} onRefresh={load} />
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                {canCreate && (
                  <Button onClick={() => setShowNewDialog(true)}><Plus className="h-4 w-4 mr-1" /> Novo Bag</Button>
                )}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="Aberto">Aberto</SelectItem>
                    <SelectItem value="Fechado">Fechado</SelectItem>
                    <SelectItem value="Exportado">Exportado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="super">Super</SelectItem>
                    <SelectItem value="pecas">Peças</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhum bag encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((bag) => (
                    <BagCard key={bag.id} bag={bag} onClick={setSelectedBag} />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="alocar" className="space-y-4">
          <AllocationPanel bags={bags} onAllocated={load} />
        </TabsContent>

        <TabsContent value="filiais">
          <BranchStockList />
        </TabsContent>

        <TabsContent value="analise">
          <BagAnalysisPanel />
        </TabsContent>
      </Tabs>

      {canCreate && <NewBagDialog open={showNewDialog} onOpenChange={setShowNewDialog} onCreated={load} />}
    </div>
  );
}
