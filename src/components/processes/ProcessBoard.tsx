import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp, Package, Clock, BarChart3 } from "lucide-react";
import { Purchase, STAGE_ROLES, canUserActOnStage, loadPurchases, getFlowStatuses, getStatusColor, isPurchaseClosed, isInParallelPhase } from "@/lib/purchases";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
import StageActionCard from "./StageActionCard";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  // Collect all statuses that appear in current purchases
  const allActiveStatuses = useMemo(() => {
    const statuses = new Set<string>();
    filtered.forEach((p) => {
      statuses.add(p.status);
    });
    return [...statuses];
  }, [filtered]);

  // Stages the current user can act on
  const userStages = useMemo(() => {
    if (!canAdvance) return [];
    if (role === "super_admin" || role === "admin") return allActiveStatuses;
    return allActiveStatuses.filter((s) => canUserActOnStage(role, s));
  }, [role, canAdvance, allActiveStatuses]);

  // Pending tasks: purchases in stages the user can act on (excluding closed)
  const pendingTasks = useMemo(() => {
    return filtered.filter((p) => {
      if (isPurchaseClosed(p)) return false;
      // For parallel phase cerâmico, show as pending if sub-flows aren't done
      if (isInParallelPhase(p)) return true;
      return userStages.includes(p.status);
    });
  }, [filtered, userStages]);

  // Group pending by status
  const tasksByStage = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    userStages.forEach((s) => { map[s] = []; });
    // Add special "Paralelo" bucket for cerâmico in parallel phase
    map["Cerâmico: Aprovado (Paralelo)"] = [];
    pendingTasks.forEach((p) => {
      if (isInParallelPhase(p)) {
        map["Cerâmico: Aprovado (Paralelo)"].push(p);
      } else if (map[p.status]) {
        map[p.status].push(p);
      }
    });
    return map;
  }, [pendingTasks, userStages]);

  // Stages with pending items (for tabs)
  const activeStages = useMemo(() => {
    const stages = userStages.filter((s) => (tasksByStage[s]?.length || 0) > 0);
    if ((tasksByStage["Cerâmico: Aprovado (Paralelo)"]?.length || 0) > 0) {
      stages.push("Cerâmico: Aprovado (Paralelo)");
    }
    return stages;
  }, [userStages, tasksByStage]);

  // KPIs
  const totalValue = filtered.reduce((sum, p) => sum + p.totalBrl, 0);
  const activeCount = filtered.filter((p) => !isPurchaseClosed(p)).length;
  const completedCount = filtered.filter((p) => isPurchaseClosed(p)).length;

  const isAdmin = role === "super_admin" || role === "admin";
  const defaultTab = activeStages[0] || "Aguardando Inclusão";

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

      {/* Pipeline summary */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Pipeline Completo</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {allActiveStatuses.map((s) => {
                const count = filtered.filter(p => p.status === s).length;
                return (
                  <Badge key={s} variant={count > 0 ? "default" : "outline"} className="text-xs">
                    {s}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
          {pendingTasks.length} tarefa{pendingTasks.length !== 1 ? "s" : ""} pendente{pendingTasks.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Tasks by stage */}
      {pendingTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma tarefa pendente para o seu perfil.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            {activeStages.map((stage) => {
              const count = tasksByStage[stage]?.length || 0;
              return (
                <TabsTrigger key={stage} value={stage} className="text-xs">
                  {stage} {count > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {activeStages.map((stage) => (
            <TabsContent key={stage} value={stage}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(tasksByStage[stage] || []).map((purchase) => (
                  <StageActionCard key={purchase.id} purchase={purchase} onCompleted={reload} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
