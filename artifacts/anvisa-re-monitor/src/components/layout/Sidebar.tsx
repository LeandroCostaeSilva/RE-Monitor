import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Search,
  Shield,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resolucoes", label: "Resoluções", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/sincronizacao", label: "Sincronização DOU", icon: RefreshCw },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground w-64 min-h-screen">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <div>
            <p className="font-bold text-sm tracking-wide text-white">RE MONITOR</p>
            <p className="text-[10px] text-blue-300 leading-tight" style={{fontSize:"9px"}}>Consulta Pública de Resoluções - RE ANVISA publicadas em DOU</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Search className="w-4 h-4" />
          Portal Público
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 pb-2">
          Gestão
        </p>
        {navItems.map((item) => {
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
    </div>
  );
}
