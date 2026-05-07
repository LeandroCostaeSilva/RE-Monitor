import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Search,
  LogOut,
  Shield,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador", "fiscal"] },
  { href: "/resolucoes", label: "Resoluções (Admin)", icon: FileText, roles: ["administrador", "fiscal"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["administrador"] },
  { href: "/relatorios", label: "Relatorios", icon: BarChart3, roles: ["administrador", "fiscal"] },
  { href: "/sincronizacao", label: "Sincronização DOU", icon: RefreshCw, roles: ["administrador"] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        logout();
      },
      onError: () => {
        logout();
      },
    });
  };

  const visibleItems = navItems.filter(
    (item) => !user || item.roles.includes(user.perfil)
  );

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64 min-h-screen">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <div>
            <p className="font-bold text-sm tracking-wide text-white">ANVISA-RE</p>
            <p className="text-[10px] text-blue-300 uppercase tracking-widest">Monitor</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Search className="w-4 h-4" />
          Portal Publico
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 pb-2">
          Administracao
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="px-3 pb-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.nome}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user.perfil}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
