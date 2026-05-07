import { useState } from "react";
import { RefreshCw, Play, Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, Download, Database, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SyncLog {
  id: string;
  inicio: string;
  fim: string | null;
  status: "running" | "success" | "partial" | "error";
  periodo_inicio: string;
  periodo_fim: string;
  estrategia_usada: string | null;
  total_encontrados: number | null;
  total_inseridos: number | null;
  total_atualizados: number | null;
  total_erros: number | null;
  mensagem: string | null;
  created_at: string;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("anvisa_token");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(err.message ?? res.statusText);
  }
  return res.json() as Promise<unknown>;
}

function StatusBadge({ status }: { status: SyncLog["status"] }) {
  const map = {
    running: { label: "Em andamento", className: "bg-blue-100 text-blue-800 border-blue-200", icon: <Clock className="w-3 h-3 animate-spin" /> },
    success: { label: "Sucesso", className: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
    partial: { label: "Parcial", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <AlertTriangle className="w-3 h-3" /> },
    error: { label: "Erro", className: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.error;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.className}`}>
      {s.icon} {s.label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function duration(inicio: string, fim: string | null) {
  if (!fim) return "—";
  const secs = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function SincronizacaoDou() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [syncFrom, setSyncFrom] = useState(weekAgo);
  const [syncTo, setSyncTo] = useState(today);
  const [backfillFrom, setBackfillFrom] = useState("2020-01-01");
  const [backfillTo, setBackfillTo] = useState(today);
  const [importTexto, setImportTexto] = useState("");
  const [importData, setImportData] = useState(today);

  const { data: logsData, isLoading: logsLoading } = useQuery<{ data: SyncLog[] }>({
    queryKey: ["sync-logs"],
    queryFn: () => apiFetch("/api/v1/admin/sync-logs?limit=20") as Promise<{ data: SyncLog[] }>,
    refetchInterval: 5000,
  });

  const { data: latestData } = useQuery<{ data: SyncLog | null }>({
    queryKey: ["sync-logs-latest"],
    queryFn: () => apiFetch("/api/v1/admin/sync-logs/latest") as Promise<{ data: SyncLog | null }>,
    refetchInterval: 3000,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/admin/sync-dou", {
      method: "POST",
      body: JSON.stringify({ date_from: syncFrom, date_to: syncTo }),
    }),
    onSuccess: () => {
      toast({ title: "Sincronização iniciada", description: `Buscando REs de ${fmtDate(syncFrom)} a ${fmtDate(syncTo)}` });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["sync-logs"] }), 1500);
    },
    onError: (err: Error) => toast({ title: "Erro ao iniciar sync", description: err.message, variant: "destructive" }),
  });

  const importTextMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/admin/sync-dou/import-text", {
      method: "POST",
      body: JSON.stringify({ texto: importTexto, data_referencia: importData }),
    }),
    onSuccess: () => {
      toast({ title: "Importação iniciada", description: "A IA está processando o texto. O resultado aparecerá no histórico abaixo." });
      setImportTexto("");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["sync-logs"] }), 2000);
    },
    onError: (err: Error) => toast({ title: "Erro na importação", description: err.message, variant: "destructive" }),
  });

  const backfillMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/admin/sync-dou/backfill", {
      method: "POST",
      body: JSON.stringify({ start_date: backfillFrom, end_date: backfillTo }),
    }),
    onSuccess: () => {
      toast({ title: "Backfill iniciado", description: `Processando REs de ${fmtDate(backfillFrom)} até ${fmtDate(backfillTo)} em background` });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["sync-logs"] }), 2000);
    },
    onError: (err: Error) => toast({ title: "Erro ao iniciar backfill", description: err.message, variant: "destructive" }),
  });

  const logs = logsData?.data ?? [];
  const latest = latestData?.data;
  const isRunning = latest?.status === "running";

  if (user?.perfil !== "administrador" && user?.perfil !== "admin") {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold">Acesso restrito</h2>
          <p className="text-muted-foreground mt-1">Esta página é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Sincronização com DOU
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Busca e importa Resoluções Específicas publicadas no Diário Oficial da União, com extração automática por IA.
        </p>
      </div>

      {/* Status do último sync */}
      {latest && (
        <Card className={`border-l-4 ${latest.status === "success" ? "border-l-green-500" : latest.status === "running" ? "border-l-blue-500" : latest.status === "partial" ? "border-l-yellow-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Última Sincronização</CardTitle>
              <StatusBadge status={latest.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Iniciado em</p>
                <p className="text-sm font-medium">{fmtDatetime(latest.inicio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="text-sm font-medium">{duration(latest.inicio, latest.fim)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estratégia</p>
                <p className="text-sm font-medium font-mono">{latest.estrategia_usada ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="text-sm font-medium">{fmtDate(latest.periodo_inicio)} – {fmtDate(latest.periodo_fim)}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">Encontradas: <strong className="text-foreground">{latest.total_encontrados ?? 0}</strong></span>
              <span className="text-green-700">Inseridas: <strong>{latest.total_inseridos ?? 0}</strong></span>
              <span className="text-blue-700">Atualizadas: <strong>{latest.total_atualizados ?? 0}</strong></span>
              {(latest.total_erros ?? 0) > 0 && <span className="text-red-700">Erros: <strong>{latest.total_erros}</strong></span>}
            </div>
            {latest.mensagem && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted rounded p-2 font-mono leading-relaxed">{latest.mensagem}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Manual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Sincronização Manual
            </CardTitle>
            <CardDescription>
              Busca REs publicadas em um período específico (máx. 90 dias por execução).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sync-from" className="text-xs">Data inicial</Label>
                <Input id="sync-from" type="date" value={syncFrom} onChange={e => setSyncFrom(e.target.value)} className="mt-1" max={today} />
              </div>
              <div>
                <Label htmlFor="sync-to" className="text-xs">Data final</Label>
                <Input id="sync-to" type="date" value={syncTo} onChange={e => setSyncTo(e.target.value)} className="mt-1" max={today} />
              </div>
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isRunning}
              className="w-full"
            >
              {syncMutation.isPending || isRunning
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sincronizando...</>
                : <><Play className="w-4 h-4 mr-2" /> Iniciar Sincronização</>}
            </Button>
            <p className="text-xs text-muted-foreground">
              A sincronização roda em background. O resultado aparece no histórico abaixo em tempo real.
            </p>
          </CardContent>
        </Card>

        {/* Backfill */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-orange-500" />
              Backfill Completo
            </CardTitle>
            <CardDescription>
              Reprocessa todo o histórico de REs publicadas desde janeiro/2020. Executa mês a mês em background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bf-from" className="text-xs">Início do backfill</Label>
                <Input id="bf-from" type="date" value={backfillFrom} onChange={e => setBackfillFrom(e.target.value)} className="mt-1" min="2020-01-01" max={today} />
              </div>
              <div>
                <Label htmlFor="bf-to" className="text-xs">Fim do backfill</Label>
                <Input id="bf-to" type="date" value={backfillTo} onChange={e => setBackfillTo(e.target.value)} className="mt-1" max={today} />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending || isRunning}
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {backfillMutation.isPending
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Iniciando...</>
                : <><Download className="w-4 h-4 mr-2" /> Iniciar Backfill</>}
            </Button>
            <p className="text-xs text-muted-foreground">
              Pode levar vários minutos. Cada mês é processado individualmente. O job diário automático ocorre às 07h BRT.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual text import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            Importação Manual por Texto
          </CardTitle>
          <CardDescription>
            Cole o texto de publicações do DOU (ou PDF convertido) para extração automática por IA. Útil quando o acesso ao DOU está bloqueado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="import-data" className="text-xs">Data de referência da publicação</Label>
            <Input id="import-data" type="date" value={importData} onChange={e => setImportData(e.target.value)} className="mt-1 w-48" max={today} />
          </div>
          <div>
            <Label htmlFor="import-texto" className="text-xs">Texto do DOU (cole aqui)</Label>
            <textarea
              id="import-texto"
              value={importTexto}
              onChange={e => setImportTexto(e.target.value)}
              placeholder={"RESOLUÇÃO ESPECÍFICA - RE Nº X.XXX, DE XX DE XXXXXX DE 20XX\n\nA DIRETORA DA AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA - ANVISA, no uso...\n\nArt. 1º Fica determinada a suspensão..."}
              rows={8}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground mt-1">{importTexto.length} caracteres · mínimo: 50</p>
          </div>
          <Button
            onClick={() => importTextMutation.mutate()}
            disabled={importTextMutation.isPending || importTexto.trim().length < 50 || isRunning}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {importTextMutation.isPending
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              : <><FileText className="w-4 h-4 mr-2" /> Extrair REs com IA</>}
          </Button>
        </CardContent>
      </Card>

      {/* Como funciona */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Como funciona a sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold text-foreground shrink-0">1.</span>
              <span><strong className="text-foreground">Coleta multi-estratégia:</strong> o sistema tenta 4 fontes em cascata — API JSON do DOU, RSS Seção 3, API AJAX do DOU e listagem ANVISA gov.br. Usa a primeira que responder com conteúdo válido.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground shrink-0">2.</span>
              <span><strong className="text-foreground">Parsing por IA (GPT):</strong> o texto bruto coletado é enviado ao GPT para extrair número da RE, produto, fabricante, lotes afetados, tipo de ação e demais campos estruturados.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground shrink-0">3.</span>
              <span><strong className="text-foreground">Upsert inteligente:</strong> REs novas são inseridas; existentes têm status, lotes e ementa atualizados. Todo movimento gera registro no histórico de auditoria.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-foreground shrink-0">4.</span>
              <span><strong className="text-foreground">Job diário automático:</strong> roda todo dia às 07h (horário de Brasília) para capturar publicações do DOU do dia anterior automaticamente.</span>
            </li>
          </ol>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Nota:</strong> O DOU utiliza proteção Cloudflare que pode bloquear acessos automatizados. Quando ocorre bloqueio, o status aparece como &quot;Erro&quot; e o sistema tenta novamente no próximo ciclo. Para garantir cobertura máxima em caso de bloqueio persistente, recomenda-se acionar o suporte ANVISA para whitelist do IP de produção.
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Syncs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico de Sincronizações
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["sync-logs"] })}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma sincronização realizada ainda. Use os controles acima para iniciar.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded border border-border hover:bg-muted/30 transition-colors">
                  <StatusBadge status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{fmtDate(log.periodo_inicio)} → {fmtDate(log.periodo_fim)}</span>
                      {log.estrategia_usada && (
                        <Badge variant="outline" className="text-[10px] font-mono">{log.estrategia_usada}</Badge>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{fmtDatetime(log.inicio)}</span>
                      <span>duração: {duration(log.inicio, log.fim)}</span>
                      {(log.total_inseridos ?? 0) > 0 && <span className="text-green-700">+{log.total_inseridos} inseridas</span>}
                      {(log.total_atualizados ?? 0) > 0 && <span className="text-blue-700">{log.total_atualizados} atualizadas</span>}
                      {(log.total_erros ?? 0) > 0 && <span className="text-red-700">{log.total_erros} erros</span>}
                    </div>
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
