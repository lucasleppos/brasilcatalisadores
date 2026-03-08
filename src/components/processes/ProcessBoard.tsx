import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp, Package, Clock, BarChart3 } from "lucide-react";
import { Purchase, STAGE_ROLES, canUserActOnStage, loadPurchases, getStatusColor, isPurchaseClosed, isInParallelPhase, PECAS_FLOW, CERAMICO_FLOW, CER_FIN_STATUSES, CER_OP_STATUSES } from "@/lib/purchases";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
import StageActionCard from "./StageActionCard";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Build ordered display stages: unique stages from both flows in flowchart order,
// plus special loop/branch states and parallel bucket
const ORDERED_DISPLAY_STAGES: string[] = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const addUnique = (s: string) => { if (!seen.has(s)) { seen.add(s); ordered.push(s); } };

  // Common stages first (shared prefix of both flows)
  const commonEnd = 3; // first 3 are common
  for (let i = 0; i < commonEnd; i++) addUnique(PECAS_FLOW[i]);

  // Peças flow (after common)
  for (let i = commonEnd; i < PECAS_FLOW.length; i++) addUnique(PECAS_FLOW[i]);
  // Add loop states not in linear flow
  addUnique("Peças: Demonstrativo Contestado");
  addUnique("Peças: Peso Divergente");

  // Cerâmico flow (after common)
  for (let i = commonEnd; i < CERAMICO_FLOW.length; i++) addUnique(CERAMICO_FLOW[i]);
  addUnique("Cerâmico: Demonstrativo Contestado");
  // Parallel bucket
  addUnique("Cerâmico: Aprovado (Paralelo)");

  return ordered;
})();

export default function ProcessBoard() {
  const { role } = useAuth();
  const { canDo } = usePermissions();
  const canAdvance = canDo("processos", "advance_stage");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");

  const reload = () => loadPurchases().then(setPurchases);
  useEffect(() => { reload(); }, []);

  const suppliers = useMemo(() => [...new Set(purchases.map((p) => p.supplierName))], [purchases]);
  const buyers = useMemo(() => [...new Set(purchases.map((p) => p.buyer).filter(Boolean))], [purchases]);

  const filtered = useMemo(() => {
    let result = purchases;
    if (supplierFilter !== "all") result = result.filter((p) => p.supplierName === supplierFilter);
    if (buyerFilter !== "all") result = result.filter((p) => p.buyer === buyerFilter);
    return result;
  }, [purchases, supplierFilter, buyerFilter]);

  const isAdmin = role === "super_admin" || role === "admin";

  // Fixed stages the user can see (based on role, always in flowchart order)
  const displayStages = useMemo(() => {
    if (!canAdvance) return [];
    if (isAdmin) return ORDERED_DISPLAY_STAGES;
    return ORDERED_DISPLAY_STAGES.filter((s) => canUserActOnStage(role, s));
  }, [role, canAdvance, isAdmin]);

  // Group purchases by stage
  const tasksByStage = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    displayStages.forEach((s) => { map[s] = []; });

    filtered.forEach((p) => {
      if (isPurchaseClosed(p)) return;
      if (isInParallelPhase(p)) {
        if (map["Cerâmico: Aprovado (Paralelo)"]) map["Cerâmico: Aprovado (Paralelo)"].push(p);
      } else if (map[p.status]) {
        map[p.status].push(p);
      }
    });
    return map;
  }, [filtered, displayStages]);

  // Pending count
  const pendingCount = useMemo(() =>
    displayStages.reduce((sum, s) => sum + (tasksByStage[s]?.length || 0), 0)
  , [displayStages, tasksByStage]);

  // Default tab: first stage with items
  const defaultTab = useMemo(() =>
    displayStages.find((s) => (tasksByStage[s]?.length || 0) > 0) || displayStages[0] || "Aguardando Inclusão"
  , [displayStages, tasksByStage]);

  // KPIs
  const totalValue = filtered.reduce((sum, p) => sum + p.totalBrl, 0);
  const activeCount = filtered.filter((p) => !isPurchaseClosed(p)).length;
  const completedCount = filtered.filter((p) => isPurchaseClosed(p)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display">Processos</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Total Compras</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500/60" />
              <div>
                <p className="text-xs text-muted-foreground">Em Produção</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500/60" />
              <div>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold">{fmtBrl(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={buyerFilter} onValueChange={setBuyerFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os compradores</SelectItem>
            {buyers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs h-8 flex items-center">
          {pendingCount} tarefa{pendingCount !== 1 ? "s" : ""} pendente{pendingCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Tasks by stage — fixed tabs */}
      {displayStages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma tarefa pendente para o seu perfil.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            {displayStages.map((stage) => {
              const count = tasksByStage[stage]?.length || 0;
              // Shorten label for tabs
              const shortLabel = stage
                .replace("Peças: ", "P: ")
                .replace("Cerâmico: ", "C: ")
                .replace(" (Paralelo)", " ∥");
              return (
                <TabsTrigger key={stage} value={stage} className="text-xs">
                  {shortLabel}
                  <Badge variant={count > 0 ? "default" : "outline"} className="ml-1 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {displayStages.map((stage) => (
            <TabsContent key={stage} value={stage}>
              {(tasksByStage[stage]?.length || 0) === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">Nenhum pedido nesta etapa.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(tasksByStage[stage] || []).map((purchase) => (
                    <StageActionCard key={purchase.id} purchase={purchase} onCompleted={reload} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
