import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  Calculator,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lotes", url: "/lotes", icon: Package },
  { title: "Bags", url: "/bags", icon: ShoppingBag },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Calculadora", url: "/calculadora", icon: Calculator },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
              {menuItems.map((item) => {
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
