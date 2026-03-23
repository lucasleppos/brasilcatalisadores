import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity } from "lucide-react";
import { Purchase, STAGE_ROLES, canUserActOnStage, loadPurchases, isPurchaseClosed, isInParallelPhase, CER_FIN_STATUSES, CER_OP_STATUSES } from "@/lib/purchases";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { subDays, isAfter, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import ProcessKPIs from "./ProcessKPIs";
import ProcessFilters, { DateFilterPreset } from "./ProcessFilters";
import StageActionCard from "./StageActionCard";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ===== 11 Fixed Process Groups =====
interface ProcessGroup {
  label: string;
  statuses: string[];
  /** Also match purchases in parallel phase by sub-flow type */
  parallelMatch?: "fin" | "op";
}

const PROCESS_GROUPS: ProcessGroup[] = [
  { label: "Inclusão", statuses: ["Aguardando Inclusão"] },
  { label: "Conferência", statuses: ["Aguardando Conferência", "Em Conferência"] },
  { label: "Separação", statuses: ["Cerâmico: Em Separação"] },
  { label: "Corte", statuses: ["Peças: Em Corte"] },
  {
    label: "Trit. / Homog. / Amostr.",
    statuses: [
      "Peças: Em Trituração",
      "Cerâmico: Em Trituração/Homogeneização",
      "Peças: Em Amostragem",
    ],
  },
  {
    label: "Prep. Amostra / Análise",
    statuses: [
      "Cerâmico: Amostra Enviada ao Lab",
      "Cerâmico: Lab em Análise",
      "Cerâmico: Resultado Incluído",
    ],
  },
  {
    label: "Precif. / Demonstrativo",
    statuses: [
      "Peças: Aguardando Demonstrativo",
      "Cerâmico: Em Precificação",
      "Peças: Pesagem Realizada",
      "Peças: Peso Divergente",
    ],
  },
  {
    label: "Aprovação",
    statuses: [
      "Peças: Gerar Boleto de Aprovação",
      "Cerâmico: Gerar Boleto de Aprovação",
      "Peças: Demonstrativo Contestado",
      "Cerâmico: Demonstrativo Contestado",
    ],
  },
  {
    label: "Pagamento",
    statuses: [
      "Peças: Aprovado - Aguardando Pagamento",
      "Peças: Pagamento Realizado",
    ],
    parallelMatch: "fin",
  },
  {
    label: "Bags / Exportação",
    statuses: ["Peças: Alocado ao Bag"],
    parallelMatch: "op",
  },
  {
    label: "Concluídos",
    statuses: ["Concluído", "Peças: Encerrado", "Cerâmico: Encerrado"],
  },
];

/** Check if a user role can see a group (has permission on at least one status in the group) */
function canRoleSeeGroup(role: string | null, group: ProcessGroup): boolean {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;
  return group.statuses.some((s) => canUserActOnStage(role, s));
}

export default function ProcessBoard() {
  const { role } = useAuth();
  const { canDo } = usePermissions();
  const canAdvance = canDo("processos", "advance_stage");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const reload = () => loadPurchases().then(setPurchases);
  useEffect(() => { reload(); }, []);

  const suppliers = useMemo(() => [...new Set(purchases.map((p) => p.supplierName))], [purchases]);
  const buyers = useMemo(() => [...new Set(purchases.map((p) => p.buyer).filter(Boolean))], [purchases]);

  const filtered = useMemo(() => {
    let result = purchases;
    if (supplierFilter !== "all") result = result.filter((p) => p.supplierName === supplierFilter);
    if (buyerFilter !== "all") result = result.filter((p) => p.buyer === buyerFilter);

    // Date filter
    if (customRange?.from) {
      const from = customRange.from;
      const to = customRange.to || customRange.from;
      result = result.filter((p) => {
        const d = parseISO(p.date);
        return d >= from && d <= new Date(to.getTime() + 86400000);
      });
    } else if (datePreset === "week") {
      const cutoff = subDays(new Date(), 7);
      result = result.filter((p) => isAfter(parseISO(p.date), cutoff));
    } else if (datePreset === "month") {
      const cutoff = subDays(new Date(), 30);
      result = result.filter((p) => isAfter(parseISO(p.date), cutoff));
    }
    // "all" = no date filter

    return result;
  }, [purchases, supplierFilter, buyerFilter, datePreset, customRange]);

  const isAdmin = role === "super_admin" || role === "admin";

  // Which groups this user can see
  const visibleGroups = useMemo(() => {
    if (!canAdvance) return [];
    return PROCESS_GROUPS.filter((g) => canRoleSeeGroup(role, g));
  }, [role, canAdvance]);

  // Group purchases into process groups
  const tasksByGroup = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    visibleGroups.forEach((g) => { map[g.label] = []; });

    filtered.forEach((p) => {
      // Parallel phase (Cerâmico: Aprovado with sub-flows) goes to Pagamento AND/OR Bags
      if (isInParallelPhase(p)) {
        const pagGroup = visibleGroups.find((g) => g.parallelMatch === "fin");
        const bagGroup = visibleGroups.find((g) => g.parallelMatch === "op");
        // Show in Pagamento if fin sub-flow not done
        if (pagGroup && p.finStatus && p.finStatus !== "Encerrado ERP") {
          map[pagGroup.label]?.push(p);
        }
        // Show in Bags if op sub-flow not done
        if (bagGroup && p.opStatus && p.opStatus !== "Enviado Exportação") {
          map[bagGroup.label]?.push(p);
        }
        // If both done but main status not yet Encerrado, show in Encerrados
        if (p.finStatus === "Encerrado ERP" && p.opStatus === "Enviado Exportação") {
          if (map["Encerrados"]) map["Encerrados"].push(p);
        }
        return;
      }

      // Normal: find group by status match
      for (const g of visibleGroups) {
        if (g.statuses.includes(p.status)) {
          map[g.label].push(p);
          return;
        }
      }
    });

    return map;
  }, [filtered, visibleGroups]);

  const pendingCount = useMemo(() =>
    visibleGroups
      .filter((g) => g.label !== "Encerrados")
      .reduce((sum, g) => sum + (tasksByGroup[g.label]?.length || 0), 0)
  , [visibleGroups, tasksByGroup]);

  const defaultTab = useMemo(() =>
    visibleGroups.find((g) => (tasksByGroup[g.label]?.length || 0) > 0)?.label || visibleGroups[0]?.label || ""
  , [visibleGroups, tasksByGroup]);

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

      <ProcessKPIs
        totalCount={filtered.length}
        activeCount={activeCount}
        completedCount={completedCount}
        totalValue={totalValue}
      />

      <ProcessFilters
        suppliers={suppliers}
        buyers={buyers}
        supplierFilter={supplierFilter}
        buyerFilter={buyerFilter}
        onSupplierChange={setSupplierFilter}
        onBuyerChange={setBuyerFilter}
        pendingCount={pendingCount}
      />

      {/* Tasks by group — fixed tabs */}
      {visibleGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma tarefa pendente para o seu perfil.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            {visibleGroups.map((group) => {
              const count = tasksByGroup[group.label]?.length || 0;
              return (
                <TabsTrigger key={group.label} value={group.label} className="text-xs">
                  {group.label}
                  <Badge variant={count > 0 ? "default" : "outline"} className="ml-1 text-[10px] h-4 px-1 min-w-[1.25rem] justify-center">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {visibleGroups.map((group) => (
            <TabsContent key={group.label} value={group.label}>
              {(tasksByGroup[group.label]?.length || 0) === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">Nenhum pedido neste processo.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(tasksByGroup[group.label] || []).map((purchase) => (
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
