import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package, Activity, ShoppingBag, CheckCircle2, MoreHorizontal, Users, BarChart3,
  Calculator, BookOpen, Settings, UserCog, Shield, LayoutDashboard, User, LogOut } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { MobileTabBar, MobileTab } from "@/components/mobile/MobileTabBar";
import { PROCESS_GROUPS, canRoleSeeGroup } from "@/components/processes/ProcessBoard";
import { groupUI } from "@/lib/process-group-ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


interface NavItem {
  key: string;
  label: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
}

const PRIMARY: NavItem[] = [
  { key: "compras", label: "Compras", url: "/compras", icon: Package, module: "compras" },
  { key: "processos", label: "Processos", url: "/processos", icon: Activity, module: "processos" },
  { key: "bags", label: "Bags", url: "/bags", icon: ShoppingBag, module: "bags" },
  { key: "concluidos", label: "Concluídos", url: "/concluidos", icon: CheckCircle2, module: "concluidos" },
];

const SECONDARY: NavItem[] = [
  { key: "dashboard", label: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { key: "fornecedores", label: "Fornecedores", url: "/fornecedores", icon: Users, module: "fornecedores" },
  { key: "relatorios", label: "Relatórios", url: "/relatorios", icon: BarChart3, module: "relatorios" },
  { key: "calculadora", label: "Calculadora", url: "/calculadora", icon: Calculator, module: "calculadora" },
  { key: "catalogo", label: "Catálogo", url: "/catalogo", icon: BookOpen, module: "catalogo" },
  { key: "configuracoes", label: "Configurações", url: "/configuracoes", icon: Settings, module: "configuracoes" },
  { key: "usuarios", label: "Usuários", url: "/usuarios", icon: UserCog, module: "usuarios" },
  { key: "permissoes", label: "Permissões", url: "/permissoes", icon: Shield, module: "permissoes" },
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/compras": "Compras",
  "/processos": "Processos",
  "/bags": "Bags",
  "/concluidos": "Concluídos",
  "/fornecedores": "Fornecedores",
  "/relatorios": "Relatórios",
  "/calculadora": "Calculadora",
  "/catalogo": "Catálogo",
  "/configuracoes": "Configurações",
  "/usuarios": "Usuários",
  "/permissoes": "Permissões",
  "/perfil": "Meu Perfil",
};

interface MobileNavValue {
  /** Usuário tem acesso a apenas um módulo — a página pode assumir a barra inferior */
  singleModule: boolean;
  /** A página assumiu o controle do cabeçalho grande */
  ownsHeader: boolean;
  setOwnsHeader: (v: boolean) => void;
  /** A barra inferior está exibindo as etapas do processo (usuário operacional) */
  stageTabsInBar: boolean;
  activeStage: string;
  setActiveStage: (v: string) => void;
  setStageCounts: (counts: Record<string, number>) => void;
}

const MobileNavContext = createContext<MobileNavValue>({
  singleModule: false,
  ownsHeader: false,
  setOwnsHeader: () => {},
  stageTabsInBar: false,
  activeStage: "",
  setActiveStage: () => {},
  setStageCounts: () => {},
});

export const useMobileNav = () => useContext(MobileNavContext);

const MAX_STAGE_TABS = 4;

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const { canAccess } = usePermissions();
  const { profile, user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [ownsHeader, setOwnsHeader] = useState(false);
  const [activeStage, setActiveStage] = useState("");
  const [stageCounts, setStageCountsState] = useState<Record<string, number>>({});

  const setStageCounts = useCallback((counts: Record<string, number>) => {
    setStageCountsState((prev) => {
      const keys = Object.keys(counts);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every((k) => prev[k] === counts[k])
      ) {
        return prev;
      }
      return counts;
    });
  }, []);

  const visiblePrimary = useMemo(
    () => PRIMARY.filter((i) => !i.module || canAccess(i.module)),
    [canAccess]
  );
  const visibleSecondary = useMemo(
    () => SECONDARY.filter((i) => !i.module || canAccess(i.module)),
    [canAccess]
  );

  const isAdmin = role === "super_admin" || role === "admin";
  const isOperational = !isAdmin && canAccess("processos");

  const stageGroups = useMemo(
    () => (isOperational ? PROCESS_GROUPS.filter((g) => canRoleSeeGroup(role, g)) : []),
    [isOperational, role]
  );

  const barStages = stageGroups.slice(0, MAX_STAGE_TABS);
  const overflowStages = stageGroups.slice(MAX_STAGE_TABS);
  /** Barra mostra etapas quando o operacional tem mais de uma etapa */
  const stageTabsInBar = isOperational && stageGroups.length > 1;

  const otherModules = useMemo(
    () =>
      stageTabsInBar
        ? [...visiblePrimary.filter((i) => i.key !== "processos"), ...visibleSecondary]
        : visibleSecondary,
    [stageTabsInBar, visiblePrimary, visibleSecondary]
  );

  const totalModules = visiblePrimary.length + visibleSecondary.length;
  const singleModule = totalModules <= 1;

  const tabs: MobileTab[] = useMemo(() => {
    if (stageTabsInBar) {
      const t: MobileTab[] = barStages.map((g) => {
        const ui = groupUI(g.label);
        return {
          key: g.label,
          label: ui.short,
          icon: ui.icon,
          count: stageCounts[g.label] || 0,
        };
      });
      t.push({ key: "__more", label: "Mais", icon: MoreHorizontal });
      return t;
    }
    const t: MobileTab[] = visiblePrimary.map((i) => ({ key: i.key, label: i.label, icon: i.icon }));
    if (visibleSecondary.length > 0) {
      t.push({ key: "__more", label: "Mais", icon: MoreHorizontal });
    }
    return t;
  }, [stageTabsInBar, barStages, stageCounts, visiblePrimary, visibleSecondary]);

  const activeKey = stageTabsInBar
    ? pathname === "/processos" && barStages.some((g) => g.label === activeStage)
      ? activeStage
      : "__more"
    : visiblePrimary.find((i) => i.url === pathname)?.key ?? "__more";

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const title = TITLES[pathname] || "";

  const goToStage = (label: string) => {
    setActiveStage(label);
    if (pathname !== "/processos") navigate("/processos");
  };


  return (
    <MobileNavContext.Provider
      value={{
        singleModule,
        ownsHeader,
        setOwnsHeader,
        stageTabsInBar,
        activeStage,
        setActiveStage,
        setStageCounts,
      }}
    >

      <div className="flex flex-col h-[100dvh] bg-background">
        {!ownsHeader && (
          <header className="shrink-0 bg-card border-b border-border px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-display truncate">{title}</h1>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-label="Menu"
                className="shrink-0"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>

        {!(singleModule && !stageTabsInBar) && (
          <MobileTabBar
            tabs={tabs}
            active={activeKey}
            onChange={(key) => {
              if (key === "__more") {
                setMoreOpen(true);
                return;
              }
              if (stageTabsInBar) {
                goToStage(key);
                return;
              }
              const item = visiblePrimary.find((i) => i.key === key);
              if (item) navigate(item.url);
            }}
          />
        )}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>{profile?.full_name || user?.email || "Menu"}</SheetTitle>
            </SheetHeader>
            <div className="mt-2 divide-y divide-border">
              {overflowStages.map((g) => {
                const ui = groupUI(g.label);
                return (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      goToStage(g.label);
                    }}
                    className="w-full flex items-center gap-3 py-3 text-left active:bg-muted/60"
                  >
                    <ui.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[15px] flex-1">{g.label}</span>
                    <span className="text-xs text-muted-foreground">{stageCounts[g.label] || 0}</span>
                  </button>
                );
              })}
              {otherModules.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(item.url);
                  }}
                  className="w-full flex items-center gap-3 py-3 text-left active:bg-muted/60"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[15px]">{item.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/perfil");
                }}
                className="w-full flex items-center gap-3 py-3 text-left active:bg-muted/60"
              >
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-[15px]">Meu Perfil</span>
              </button>
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center gap-3 py-3 text-left text-destructive active:bg-muted/60"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-[15px]">Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MobileNavContext.Provider>
  );
}
