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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  allowedRoles?: AppRole[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Compras", url: "/compras", icon: Package, allowedRoles: ["super_admin", "admin", "comprador"] },
  { title: "Fornecedores", url: "/fornecedores", icon: Users, allowedRoles: ["super_admin", "admin", "comprador"] },
  { title: "Processos", url: "/processos", icon: Activity, allowedRoles: ["super_admin", "admin", "operacional", "laboratorio"] },
  { title: "Bags", url: "/bags", icon: ShoppingBag, allowedRoles: ["super_admin", "admin", "operacional", "comprador"] },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, allowedRoles: ["super_admin", "admin"] },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Configurações", url: "/configuracoes", icon: Settings, allowedRoles: ["super_admin"] },
  { title: "Usuários", url: "/usuarios", icon: UserCog, allowedRoles: ["super_admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useAuth();

  const visibleItems = menuItems.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!role) return false;
    return item.allowedRoles.includes(role);
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="px-4 py-6 border-b border-sidebar-border">
          {collapsed ? (
            <span className="text-sidebar-primary font-display text-lg font-bold block text-center">BS</span>
          ) : (
            <div>
              <h1 className="text-sidebar-primary font-display text-lg font-bold leading-tight">
                Brasil Sust.
              </h1>
              <p className="text-sidebar-foreground text-xs tracking-widest uppercase mt-0.5">
                Catalisador Pro
              </p>
            </div>
          )}
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
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
