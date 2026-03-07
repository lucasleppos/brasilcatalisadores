import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp, Package, Clock, BarChart3 } from "lucide-react";
import { Purchase, PURCHASE_STATUSES, PurchaseStatus, STAGE_ROLES, canUserActOnStage, loadPurchases } from "@/lib/purchases";
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

  const reload = () => loadPurchases().then(setPurchases);
  useEffect(() => { reload(); }, []);

  const suppliers = useMemo(() => [...new Set(purchases.map((p) => p.supplierName))], [purchases]);
  const filtered = supplierFilter === "all" ? purchases : purchases.filter((p) => p.supplierName === supplierFilter);

  // Stages the current user can act on
  const userStages = useMemo(() => {
    if (canAdvance) {
      // If user can advance stages, check which stages their role maps to
      // Admin/super_admin can act on all stages
      if (role === "super_admin" || role === "admin") return [...PURCHASE_STATUSES];
      return PURCHASE_STATUSES.filter((s) => canUserActOnStage(role, s));
    }
    return [];
  }, [role, canAdvance]);

  // Pending tasks: purchases in stages the user can act on
  const pendingTasks = useMemo(() => {
    return filtered.filter((p) => userStages.includes(p.status));
  }, [filtered, userStages]);

  // Group pending by status
  const tasksByStage = useMemo(() => {
    const map: Partial<Record<PurchaseStatus, Purchase[]>> = {};
    userStages.forEach((s) => { map[s] = []; });
    pendingTasks.forEach((p) => { map[p.status]?.push(p); });
    return map;
  }, [pendingTasks, userStages]);

  // Stages with pending items (for tabs)
  const activeStages = useMemo(() => {
    return userStages.filter((s) => (tasksByStage[s]?.length || 0) > 0);
  }, [userStages, tasksByStage]);

  // KPIs
  const totalValue = filtered.reduce((sum, p) => sum + p.totalBrl, 0);
  const activeCount = filtered.filter((p) => p.status !== "Exportação/Venda").length;
  const completedCount = filtered.filter((p) => p.status === "Exportação/Venda").length;

  // Pipeline summary (all statuses)
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    PURCHASE_STATUSES.forEach((s) => { map[s] = 0; });
    filtered.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return map;
  }, [filtered]);

  const isAdmin = role === "super_admin" || role === "admin";
  const defaultTab = activeStages[0] || userStages[0] || "Recebimento";

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
              {PURCHASE_STATUSES.map((s) => (
                <Badge key={s} variant={byStatus[s] > 0 ? "default" : "outline"} className="text-xs">
                  {s}: {byStatus[s]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            {userStages.map((stage) => {
              const count = tasksByStage[stage]?.length || 0;
              return (
                <TabsTrigger key={stage} value={stage} className="text-xs" disabled={count === 0}>
                  {stage} {count > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {userStages.map((stage) => (
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
