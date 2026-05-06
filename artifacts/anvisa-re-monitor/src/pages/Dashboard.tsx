import { Link } from "wouter";
import {
  useGetDashboardStats,
  useGetRecentesResolucoes,
  useGetResolucoesPorCategoria,
  useGetResolucoesPorStatus,
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, TrendingUp, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  vigente: "#ef4444",
  revogada: "#6b7280",
  encerrada: "#3b82f6",
  em_analise: "#f97316",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentes } = useGetRecentesResolucoes({ limit: 8 });
  const { data: porCategoria } = useGetResolucoesPorCategoria();
  const { data: porStatus } = useGetResolucoesPorStatus();

  const kpis = [
    {
      label: "Total de REs",
      value: stats?.total_resolucoes ?? "—",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-100",
    },
    {
      label: "Vigentes",
      value: stats?.vigentes ?? "—",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-100",
    },
    {
      label: "Em Analise",
      value: stats?.em_analise ?? "—",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-100",
    },
    {
      label: "Revogadas",
      value: stats?.revogadas ?? "—",
      icon: CheckCircle2,
      color: "text-gray-600",
      bg: "bg-gray-50 border-gray-100",
    },
    {
      label: "Encerradas",
      value: stats?.encerradas ?? "—",
      icon: XCircle,
      color: "text-blue-500",
      bg: "bg-blue-50 border-blue-100",
    },
    {
      label: "Novas este Mes",
      value: stats?.novas_este_mes ?? "—",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50 border-green-100",
    },
    {
      label: "Usuarios Ativos",
      value: stats?.total_usuarios ?? "—",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-100",
    },
  ];

  const statusChartData = porStatus?.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1).replace(/_/g, " "),
    value: s.total,
    fill: STATUS_COLORS[s.status] || "#6b7280",
  }));

  const categoriaChartData = porCategoria?.slice(0, 6).map((c) => ({
    name: c.categoria.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    total: c.total,
    vigentes: c.vigentes,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visao geral do sistema ANVISA-RE Monitor
          {stats?.ultima_atualizacao && (
            <> · Atualizado em {new Date(stats.ultima_atualizacao).toLocaleDateString("pt-BR")}</>
          )}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border ${kpi.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">REs por Categoria de Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriaChartData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoriaChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                    formatter={(value: number, name: string) => [value, name === "total" ? "Total" : "Vigentes"]}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} name="total" />
                  <Bar dataKey="vigentes" fill="#ef4444" radius={[3, 3, 0, 0]} name="vigentes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribuicao por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="w-full h-[220px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent REs */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Resolucoes Recentes</CardTitle>
          <Link href="/resolucoes" className="text-xs text-primary hover:underline">Ver todas</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentes?.map((re) => (
              <Link key={re.id} href={`/resolucoes/${re.id}`}>
                <div className="px-6 py-3 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-mono">{re.numero_re}</p>
                    <p className="text-sm font-medium truncate">{re.nome_produto}</p>
                    {re.fabricante_nome && (
                      <p className="text-xs text-muted-foreground">{re.fabricante_nome}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(re.data_publicacao).toLocaleDateString("pt-BR")}
                    </span>
                    <StatusBadge status={re.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
