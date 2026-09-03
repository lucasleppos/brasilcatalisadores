import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity } from "lucide-react";
import { Purchase, STAGE_ROLES, canUserActOnStage, loadPurchases, isPurchaseClosed, isInParallelPhase, CER_OP_STATUSES } from "@/lib/purchases";
import { isBranchPreTransfer } from "@/lib/branches";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { subDays, isAfter, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import ProcessKPIs from "./ProcessKPIs";
import ProcessFilters, { DateFilterPreset } from "./ProcessFilters";
import StageActionCard from "./StageActionCard";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ===== 11 Fixed Process Groups =====
export interface ProcessGroup {
  label: string;
  statuses: string[];
  /** Also match purchases in parallel phase by sub-flow type */
  parallelMatch?: "fin" | "op";
}

export const PROCESS_GROUPS: ProcessGroup[] = [
  { label: "Conferência", statuses: ["Aguardando Conferência", "Em Conferência"] },
  {
    label: "Moagem",
    statuses: [
      "Peças: Trituração e Amostragem",
      "Peças: Em Trituração",
      "Cerâmico: Em Trituração/Homogeneização",
      "Peças: Em Amostragem",
    ],
  },
  {
    label: "Laboratorio",
    statuses: [
      "Cerâmico: Amostra Enviada ao Lab",
      "Cerâmico: Lab em Análise",
      "Cerâmico: Resultado Incluído",
      "Peças: Laboratório",
    ],
  },
  {
    label: "Demonstrativo",
    statuses: [
      "Peças: Aguardando Demonstrativo",
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
  { label: "Corte", statuses: ["Peças: Em Corte"] },
];


/** Ordena por OP no formato DDMMYY-NN de forma cronológica crescente */
export function comparePurchaseNumber(a: string, b: string): number {
  const key = (n: string) => {
    const m = (n || "").match(/^(\d{2})(\d{2})(\d{2})-(\d+)$/);
    if (!m) return null;
    return `${m[3]}${m[2]}${m[1]}-${m[4].padStart(6, "0")}`;
  };
  const ka = key(a);
  const kb = key(b);
  if (ka && kb) return ka.localeCompare(kb);
  return (a || "").localeCompare(b || "", "pt-BR", { numeric: true });
}

/** Check if a user role can see a group (has permission on at least one status in the group) */
export function canRoleSeeGroup(role: string | null, group: ProcessGroup): boolean {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;
  return group.statuses.some((s) => canUserActOnStage(role, s));
}

export default function ProcessBoard() {
  const { role, session, loading: authLoading } = useAuth();
  const { canDo } = usePermissions();
  const canAdvance = canDo("processos", "advance_stage");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const reload = async () => {
    if (authLoading || !session) return;
    try {
      setPurchases((await loadPurchases()).filter(p => !isBranchPreTransfer(p)));
    } catch (e) {
      console.error("Erro ao carregar processos:", e);
    }
  };
  useEffect(() => { reload(); }, [authLoading, session?.user?.id]);


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

  // Compras que pertencem ao board de Processos (exclui fase paralela → Bags/Concluídos)
  const boardPurchases = useMemo(
    () => filtered.filter((p) => !isInParallelPhase(p)),
    [filtered]
  );

  // Which groups this user can see
  const visibleGroups = useMemo(() => {
    if (!canAdvance) return [];
    return PROCESS_GROUPS.filter((g) => canRoleSeeGroup(role, g));
  }, [role, canAdvance]);

  // Group purchases into process groups
  const tasksByGroup = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    visibleGroups.forEach((g) => { map[g.label] = []; });

    boardPurchases.forEach((p) => {
      for (const g of visibleGroups) {
        if (g.statuses.includes(p.status)) {
          map[g.label].push(p);
          return;
        }
      }
    });

    // OP mais antiga primeiro (ordem crescente pelo número da OP)
    Object.values(map).forEach((list) =>
      list.sort((a, b) => comparePurchaseNumber(a.purchaseNumber, b.purchaseNumber))
    );

    return map;
  }, [boardPurchases, visibleGroups]);

  const pendingCount = useMemo(() =>
    visibleGroups.reduce((sum, g) => sum + (tasksByGroup[g.label]?.length || 0), 0)
  , [visibleGroups, tasksByGroup]);

  const defaultTab = useMemo(() =>
    visibleGroups.find((g) => (tasksByGroup[g.label]?.length || 0) > 0)?.label || visibleGroups[0]?.label || ""
  , [visibleGroups, tasksByGroup]);

  // KPIs
  const totalValue = boardPurchases.reduce((sum, p) => sum + p.totalBrl, 0);
  const activeCount = boardPurchases.filter((p) => !isPurchaseClosed(p)).length;
  const completedCount = boardPurchases.filter((p) => isPurchaseClosed(p)).length;


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display">Processos</h1>
      </div>

      <ProcessKPIs
        totalCount={boardPurchases.length}
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
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
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
