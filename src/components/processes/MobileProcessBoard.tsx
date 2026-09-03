import { useState, useEffect, useMemo } from "react";
import { Search, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Purchase,
  loadPurchases,
  isInParallelPhase,
  isSacolaFlow,
} from "@/lib/purchases";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { fmtNum } from "@/lib/utils";
import { PROCESS_GROUPS, canRoleSeeGroup } from "./ProcessBoard";
import StageActionCard from "./StageActionCard";
import { MobileListRow, MobileListDivider } from "@/components/mobile/MobileListRow";
import { MobileSheet } from "@/components/mobile/MobileSheet";
import { useMobileNav } from "@/components/mobile/MobileLayout";
import { cn } from "@/lib/utils";

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function flowBadge(p: Purchase): { label: string; className: string; name: string } {
  if (p.materialFlow === "ceramico")
    return { label: "CE", className: "bg-amber-100 text-amber-800", name: "Cerâmico" };
  if (isSacolaFlow(p))
    return { label: "SA", className: "bg-emerald-100 text-emerald-800", name: "Sacola" };
  return { label: "PC", className: "bg-sky-100 text-sky-800", name: "Peças" };
}

function purchaseWeight(p: Purchase): number {
  if (p.weightReal) return p.weightReal;
  if (p.bulkWeight) return p.bulkWeight;
  if (p.weightDeclared) return p.weightDeclared;
  return p.items.reduce((s, i) => s + (i.weight || 0) * (i.quantity || 1), 0);
}

function lastChangeDate(p: Purchase): string {
  const last = p.statusHistory[p.statusHistory.length - 1];
  return last?.date || p.date;
}

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

export default function MobileProcessBoard() {
  const { role, session, loading: authLoading } = useAuth();
  const { canDo } = usePermissions();
  const { setOwnsHeader, stageTabsInBar, activeStage: navStage, setActiveStage: setNavStage, setStageCounts } = useMobileNav();
  const canAdvance = canDo("processos", "advance_stage");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");
  const [localGroup, setLocalGroup] = useState<string>("");
  const activeGroup = stageTabsInBar ? navStage : localGroup;
  const setActiveGroup = stageTabsInBar ? setNavStage : setLocalGroup;
  const [selected, setSelected] = useState<Purchase | null>(null);

  useEffect(() => {
    setOwnsHeader(true);
    return () => setOwnsHeader(false);
  }, [setOwnsHeader]);

  const reload = async () => {
    if (authLoading || !session) return;
    try {
      setPurchases(await loadPurchases());
    } catch (e) {
      console.error("Erro ao carregar processos:", e);
    }
  };
  useEffect(() => {
    reload();
  }, [authLoading, session?.user?.id]);

  const boardPurchases = useMemo(
    () => purchases.filter((p) => !isInParallelPhase(p)),
    [purchases]
  );

  const visibleGroups = useMemo(() => {
    if (!canAdvance) return [];
    return PROCESS_GROUPS.filter((g) => canRoleSeeGroup(role, g));
  }, [role, canAdvance]);

  const tasksByGroup = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    visibleGroups.forEach((g) => {
      map[g.label] = [];
    });
    boardPurchases.forEach((p) => {
      for (const g of visibleGroups) {
        if (g.statuses.includes(p.status)) {
          map[g.label].push(p);
          return;
        }
      }
    });
    // mais antigo na etapa primeiro
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(lastChangeDate(a)).getTime() - new Date(lastChangeDate(b)).getTime())
    );
    return map;
  }, [boardPurchases, visibleGroups]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    visibleGroups.forEach((g) => { counts[g.label] = tasksByGroup[g.label]?.length || 0; });
    setStageCounts(counts);
  }, [visibleGroups, tasksByGroup, setStageCounts]);

  useEffect(() => {
    if (visibleGroups.length === 0) return;
    if (activeGroup && visibleGroups.some((g) => g.label === activeGroup)) return;
    const firstWithTasks = visibleGroups.find((g) => (tasksByGroup[g.label]?.length || 0) > 0);
    setActiveGroup(firstWithTasks?.label || visibleGroups[0].label);
  }, [visibleGroups, tasksByGroup, activeGroup]);

  const currentList = useMemo(() => {
    const list = tasksByGroup[activeGroup] || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.supplierName.toLowerCase().includes(q) ||
        p.purchaseNumber.toLowerCase().includes(q) ||
        (p.erpNumber || "").toLowerCase().includes(q)
    );
  }, [tasksByGroup, activeGroup, search]);

  const singleGroup = visibleGroups.length === 1;
  const totalPending = visibleGroups.reduce(
    (s, g) => s + (tasksByGroup[g.label]?.length || 0),
    0
  );

  if (visibleGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-8 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa pendente para o seu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho grande */}
      <header className="shrink-0 bg-card border-b border-border px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-display truncate">
            {singleGroup ? "Minhas tarefas" : activeGroup || "Processos"}
          </h1>
          <Badge variant="default" className="shrink-0">
            {currentList.length}
          </Badge>
        </div>
        {singleGroup && (
          <p className="text-[13px] text-muted-foreground mt-0.5">{visibleGroups[0].label}</p>
        )}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fornecedor, nº ou boleto…"
            className="pl-9 h-10 rounded-full bg-muted/60 border-0"
          />
        </div>
        {!singleGroup && !stageTabsInBar && (
          <div className="flex gap-2 overflow-x-auto mt-3 -mx-1 px-1 pb-0.5">
            {visibleGroups.map((g) => {
              const count = tasksByGroup[g.label]?.length || 0;
              const isActive = g.label === activeGroup;
              return (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => setActiveGroup(g.label)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {g.label}
                  <span className="ml-1 opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Lista de tarefas */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Inbox className="h-9 w-9 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum pedido nesta etapa.</p>
          </div>
        ) : (
          currentList.map((p, idx) => {
            const flow = flowBadge(p);
            return (
              <div key={p.id}>
                {idx > 0 && <MobileListDivider />}
                <MobileListRow
                  badge={flow.label}
                  badgeClassName={flow.className}
                  title={p.supplierName}
                  subtitle={`${p.purchaseNumber} · ${flow.name}`}
                  detail={`${fmtNum(purchaseWeight(p), 4)} kg${
                    p.erpNumber ? ` · Boleto ${p.erpNumber}` : ""
                  }`}
                  alert={!p.erpNumber?.trim()}
                  stamp={timeSince(lastChangeDate(p))}
                  onClick={() => setSelected(p)}
                />
              </div>
            );
          })
        )}
        <div className="h-4" />
      </div>

      {/* Tarefa aberta */}
      <MobileSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={activeGroup || "Tarefa"}
        subtitle={selected ? `${selected.supplierName} · ${selected.purchaseNumber}` : undefined}
      >
        {selected && (
          <StageActionCard
            purchase={selected}
            onCompleted={() => {
              setSelected(null);
              reload();
            }}
          />
        )}
      </MobileSheet>
    </div>
  );
}
