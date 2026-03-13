import {
  LayoutDashboard,
  Package,
  Users,
  Activity,
  ShoppingBag,
  BarChart3,
  Settings,
  Calculator,
  UserCog,
  Shield,
  BookOpen } from
"lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePermissions } from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar } from
"@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  module?: string;
}

const menuItems: MenuItem[] = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
{ title: "Compras", url: "/compras", icon: Package, module: "compras" },
{ title: "Fornecedores", url: "/fornecedores", icon: Users, module: "fornecedores" },
{ title: "Processos", url: "/processos", icon: Activity, module: "processos" },
{ title: "Bags", url: "/bags", icon: ShoppingBag, module: "bags" },
{ title: "Relatórios", url: "/relatorios", icon: BarChart3, module: "relatorios" },
{ title: "Calculadora", url: "/calculadora", icon: Calculator, module: "calculadora" },
{ title: "Catálogo", url: "/catalogo", icon: BookOpen, module: "catalogo" },
{ title: "Configurações", url: "/configuracoes", icon: Settings, module: "configuracoes" },
{ title: "Usuários", url: "/usuarios", icon: UserCog, module: "usuarios" },
{ title: "Permissões", url: "/permissoes", icon: Shield, module: "permissoes" }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canAccess } = usePermissions();

  const visibleItems = menuItems.filter((item) => {
    if (!item.module) return true;
    return canAccess(item.module);
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="px-4 py-6 border-b border-sidebar-border">
          {collapsed ?
          <span className="text-sidebar-primary font-display text-lg font-bold block text-center">BS</span> :

          <div>
              <h1 className="text-sidebar-primary font-display text-lg font-bold leading-tight">
                Brasil Sustentabilidade
              </h1>
              <p className="text-sidebar-foreground text-xs tracking-widest uppercase mt-0.5">
                Catalisador Pro
              </p>
            </div>
          }
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isCalc = item.url === "/calculadora";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`transition-colors ${isCalc ? "text-sidebar-primary font-semibold" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                        
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>);

              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>);

}