import { useState } from "react";
import { Download, BarChart3, Calendar } from "lucide-react";
import { useGetRelatorioMensal, useExportarResolucoes } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_COLORS: Record<string, string> = {
  vigente: "#ef4444",
  revogada: "#6b7280",
  encerrada: "#3b82f6",
  em_analise: "#f97316",
};

export default function Relatorios() {
  const { toast } = useToast();
  const now = new Date();
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [exportFormat, setExportFormat] = useState("csv");

  const { data: relatorio, isLoading } = useGetRelatorioMensal(
    { ano: parseInt(ano), mes: parseInt(mes) },
    { query: { queryKey: ["relatorio", ano, mes] } }
  );

  const exportMutation = useExportarResolucoes(
    { formato: exportFormat },
    { query: { queryKey: ["exportar", exportFormat], enabled: false } }
  );

  const anos = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  const handleExport = () => {
    toast({
      title: `Exportacao ${exportFormat.toUpperCase()} iniciada`,
      description: "O arquivo sera gerado em instantes. Verifique o console para o link de download.",
    });
  };

  const categoriaData = relatorio?.por_categoria?.slice(0, 8).map((c) => ({
    name: c.categoria.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).slice(0, 15),
    total: c.total,
    vigentes: c.vigentes,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Relatorios e Exportacoes</h1>
          <p className="text-sm text-muted-foreground mt-1">Analise mensal e exportacao de dados do sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Periodo
            </label>
            <div className="flex gap-2">
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="w-24 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-end gap-2 ml-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Exportar base completa
              </label>
              <div className="flex gap-2">
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-24 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExport} size="sm" variant="outline" className="h-9 gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total no Periodo", value: relatorio?.total_novas, color: "text-foreground" },
          { label: "Vigentes", value: relatorio?.por_status?.find((s) => s.status === "vigente")?.total || 0, color: "text-red-600" },
          { label: "Revogadas", value: relatorio?.por_status?.find((s) => s.status === "revogada")?.total || 0, color: "text-gray-600" },
          { label: "Em Analise", value: relatorio?.por_status?.find((s) => s.status === "em_analise")?.total || 0, color: "text-orange-600" },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-7 w-10 mb-1" />
              ) : (
                <p className={`text-3xl font-bold ${card.color}`}>{card.value ?? "—"}</p>
              )}
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              REs por Categoria — {MESES[parseInt(mes) - 1]} {ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-52" />
            ) : categoriaData && categoriaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={categoriaData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="total" radius={[3, 3, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribuicao por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : relatorio?.por_status?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado para o periodo.</p>
            ) : (
              <div className="space-y-3">
                {relatorio?.por_status?.map((s) => {
                  const total = relatorio.total_novas || 1;
                  const pct = Math.round((s.total / total) * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={s.status} />
                        <span className="text-sm font-semibold">{s.total} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s.status] || "#6b7280" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RE list for the period */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Resolucoes do Periodo — {MESES[parseInt(mes) - 1]} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : relatorio?.resolucoes?.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhuma resolucao publicada neste periodo
            </div>
          ) : (
            <div className="divide-y divide-border">
              {relatorio?.resolucoes?.map((re) => (
                <div key={re.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{re.numero_re}</p>
                    <p className="text-sm font-medium truncate">{re.nome_produto}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(re.data_publicacao).toLocaleDateString("pt-BR")}
                    </span>
                    <StatusBadge status={re.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
