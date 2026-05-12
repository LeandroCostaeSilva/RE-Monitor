import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, ExternalLink, Clock, FileText, AlertTriangle,
  Gavel, ChevronDown, ChevronUp, Plus, Trash2, Scale,
} from "lucide-react";
import {
  useGetResolucao,
  useGetResolucaoHistorico,
  useListAcordaosByResolucao,
  useCreateAcordao,
  useDeleteAcordao,
} from "@workspace/api-client-react";
import type { CreateAcordaoBody } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function AddAcordaoForm({ resolucaoId, onClose }: { resolucaoId: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createAcordao = useCreateAcordao();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CreateAcordaoBody>({
    numero_acordao: "",
    data_publicacao_dou: today,
    efeito_suspensivo: false,
    numero_processo: "",
    data_decisao: "",
    tipo_decisao: "provimento",
    sumario_decisao: "",
    relator: "",
    link_dou: "",
    numero_dou_edicao: "",
    atualizar_status_re: true,
  });

  const field = (key: keyof CreateAcordaoBody, val: string | boolean | null) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.numero_acordao.trim()) return;
    createAcordao.mutate(
      { id: resolucaoId, data: form },
      {
        onSuccess: () => {
          toast({ title: "Acórdão registrado", description: `${form.numero_acordao} adicionado ao histórico.` });
          qc.invalidateQueries({ queryKey: ["acordaos", resolucaoId] });
          qc.invalidateQueries({ queryKey: ["historico", resolucaoId] });
          qc.invalidateQueries({ queryKey: ["resolucao", resolucaoId] });
          onClose();
        },
        onError: (err) => toast({ title: "Erro ao registrar", description: String(err), variant: "destructive" }),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Novo Acórdão DICOL</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Número do Acórdão *</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="Acórdão nº 23/2025-DICOL"
            value={form.numero_acordao}
            onChange={(e) => field("numero_acordao", e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="text-xs">Número do Processo</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="25351.123456/2025-12"
            value={form.numero_processo ?? ""}
            onChange={(e) => field("numero_processo", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Data de Publicação DOU *</Label>
          <Input
            type="date"
            className="mt-1 text-sm"
            value={form.data_publicacao_dou}
            onChange={(e) => field("data_publicacao_dou", e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="text-xs">Data da Decisão</Label>
          <Input
            type="date"
            className="mt-1 text-sm"
            value={form.data_decisao ?? ""}
            onChange={(e) => field("data_decisao", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Tipo de Decisão</Label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.tipo_decisao ?? "provimento"}
            onChange={(e) => field("tipo_decisao", e.target.value)}
          >
            <option value="provimento">Provimento</option>
            <option value="improvimento">Improvimento</option>
            <option value="provimento_parcial">Provimento Parcial</option>
            <option value="liminar_suspensiva">Liminar Suspensiva</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Relator</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="Nome do Diretor Relator"
            value={form.relator ?? ""}
            onChange={(e) => field("relator", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Link DOU</Label>
          <Input
            className="mt-1 text-sm"
            placeholder="https://www.in.gov.br/web/dou/-/..."
            value={form.link_dou ?? ""}
            onChange={(e) => field("link_dou", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Sumário / Ementa da Decisão</Label>
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            rows={3}
            placeholder="Resumo da decisão da DICOL..."
            value={form.sumario_decisao ?? ""}
            onChange={(e) => field("sumario_decisao", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200">
        <input
          type="checkbox"
          id="efeito_suspensivo"
          checked={form.efeito_suspensivo}
          onChange={(e) => field("efeito_suspensivo", e.target.checked)}
          className="mt-0.5 w-4 h-4"
        />
        <div>
          <label htmlFor="efeito_suspensivo" className="text-sm font-semibold text-amber-900 cursor-pointer">
            Efeito Suspensivo conferido pela DICOL
          </label>
          <p className="text-xs text-amber-700 mt-0.5">
            Marque quando a Diretoria Colegiada conferiu efeito suspensivo à medida de proibição/recolhimento/suspensão.
          </p>
        </div>
      </div>

      {form.efeito_suspensivo && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-blue-50 border border-blue-200">
          <input
            type="checkbox"
            id="atualizar_status"
            checked={form.atualizar_status_re ?? false}
            onChange={(e) => field("atualizar_status_re", e.target.checked)}
            className="mt-0.5 w-4 h-4"
          />
          <label htmlFor="atualizar_status" className="text-sm text-blue-800 cursor-pointer">
            Atualizar status da RE para <strong>Em Análise</strong> (medida suspensa por decisão DICOL)
          </label>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={createAcordao.isPending}>
          {createAcordao.isPending ? "Salvando..." : "Registrar Acórdão"}
        </Button>
      </div>
    </form>
  );
}

export default function ResolucaoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedAcordao, setExpandedAcordao] = useState<string | null>(null);

  const { data: re, isLoading, isError } = useGetResolucao(id, {
    query: { queryKey: ["resolucao", id] },
  });
  const { data: historico, isLoading: historicoLoading } = useGetResolucaoHistorico(id, {
    query: { queryKey: ["historico", id] },
  });
  const { data: acordaos, isLoading: acordaosLoading } = useListAcordaosByResolucao(id, {
    query: { queryKey: ["acordaos", id] },
  });
  const deleteAcordao = useDeleteAcordao();

  const acordaosAtivos = (acordaos ?? []).filter((a) => a.efeito_suspensivo);
  const temEfeitoSuspensivo = acordaosAtivos.length > 0;

  function handleDeleteAcordao(acordaoId: string, numero: string) {
    if (!confirm(`Remover o acórdão ${numero}?`)) return;
    deleteAcordao.mutate(
      { resolucaoId: id, acordaoId },
      {
        onSuccess: () => {
          toast({ title: "Acórdão removido" });
          qc.invalidateQueries({ queryKey: ["acordaos", id] });
          qc.invalidateQueries({ queryKey: ["historico", id] });
        },
        onError: (err) => toast({ title: "Erro ao remover", description: String(err), variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-8 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </div>
    );
  }

  if (isError || !re) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold">Resolucao nao encontrada</h2>
          <p className="text-muted-foreground mt-1 mb-4">O ID informado nao corresponde a nenhuma RE cadastrada.</p>
          <Button onClick={() => (window.location.href = "/")}>Voltar ao Portal</Button>
        </div>
      </div>
    );
  }

  const fields = [
    { label: "Numero da RE", value: re.numero_re },
    { label: "Data de Publicacao (DOU)", value: re.data_publicacao ? fmtDate(re.data_publicacao) : "—" },
    { label: "Vigencia Inicial", value: re.data_vigencia_inicio ? fmtDate(re.data_vigencia_inicio) : "—" },
    { label: "Vigencia Final", value: re.data_vigencia_fim ? fmtDate(re.data_vigencia_fim) : "Sem prazo definido" },
    { label: "Categoria do Produto", value: re.tipo_produto?.replace(/_/g, " ") },
    { label: "Principio Ativo", value: re.principio_ativo || "—" },
    { label: "Fabricante", value: re.fabricante_nome || "—" },
    { label: "CNPJ do Fabricante", value: re.fabricante_cnpj || "—" },
    { label: "Numero de Registro ANVISA", value: re.numero_registro_anvisa || "—" },
    { label: "Cadastrado em", value: re.created_at ? new Date(re.created_at).toLocaleDateString("pt-BR") : "—" },
  ];

  const tipoDecisaoLabel: Record<string, string> = {
    provimento: "Provimento",
    improvimento: "Improvimento",
    provimento_parcial: "Provimento Parcial",
    liminar_suspensiva: "Liminar Suspensiva",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
            <img src="/logo.png" alt="RE Monitor Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide text-white">RE MONITOR</p>
            <p className="text-blue-200 leading-tight" style={{ fontSize: "9px" }}>Consulta Pública de Resoluções - RE ANVISA publicadas em DOU</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Portal
        </a>

        {/* Efeito Suspensivo Alert — mostrar quando DICOL concedeu suspensão */}
        {temEfeitoSuspensivo && (
          <div className="rounded-lg p-4 mb-4 flex items-start gap-3 bg-amber-50 border-2 border-amber-400">
            <Scale className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className="bg-amber-600 text-white text-xs">EFEITO SUSPENSIVO</Badge>
                <span className="text-sm font-bold text-amber-900">
                  Medida suspensa por decisão da DICOL / Diretoria Colegiada
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                A Diretoria Colegiada da ANVISA conferiu efeito suspensivo a esta medida sanitária em recurso administrativo.
                Embora a RE esteja registrada, os efeitos da proibição/recolhimento/suspensão podem estar suspensos judicialmente ou administrativamente.
                Consulte o acórdão abaixo para detalhes.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {acordaosAtivos.map((a) => (
                  <a
                    key={a.id}
                    href={a.link_dou ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium underline-offset-2 hover:underline"
                  >
                    <Gavel className="w-3 h-3" />
                    {a.numero_acordao}
                    {a.data_publicacao_dou && ` (DOU ${fmtDate(a.data_publicacao_dou)})`}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status banner */}
        <div className={`rounded-lg p-4 mb-6 flex items-start gap-3 ${
          re.status === "vigente" ? "bg-red-50 border border-red-200" :
          re.status === "em_analise" ? "bg-orange-50 border border-orange-200" :
          "bg-gray-50 border border-gray-200"
        }`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${
            re.status === "vigente" ? "text-red-600" :
            re.status === "em_analise" ? "text-orange-600" :
            "text-gray-500"
          }`} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={re.status} />
              {re.status === "vigente" && <span className="text-sm font-semibold text-red-700">Esta resolucao esta em vigor</span>}
              {re.status === "em_analise" && <span className="text-sm font-semibold text-orange-700">Esta resolucao esta em analise</span>}
              {re.status === "revogada" && <span className="text-sm font-semibold text-gray-600">Esta resolucao foi revogada</span>}
              {re.status === "encerrada" && <span className="text-sm font-semibold text-blue-700">Esta resolucao foi encerrada</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {re.tipo_acao?.map((acao) => (
                <Badge key={acao} variant="outline" className="text-xs">
                  {acao.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <p className="text-xs text-muted-foreground font-mono mb-1">{re.numero_re}</p>
            <h1 className="text-xl font-bold text-foreground">{re.nome_produto}</h1>
          </div>

          {/* Ementa */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Ementa / Motivacao
            </p>
            <p className="text-sm text-foreground leading-relaxed">{re.ementa}</p>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {fields.map((field) => (
              <div key={field.label} className="px-6 py-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-0.5">{field.label}</p>
                <p className="text-sm font-medium text-foreground capitalize">{field.value}</p>
              </div>
            ))}
          </div>

          {/* Link DOU */}
          {re.link_documento_oficial && (
            <div className="px-6 py-4 bg-muted/20">
              <a
                href={re.link_documento_oficial}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Ver documento oficial no DOU/ANVISA
              </a>
            </div>
          )}
        </div>

        {/* Acórdãos DICOL */}
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-sm">Acórdãos da Diretoria Colegiada (DICOL)</h2>
              {acordaos && acordaos.length > 0 && (
                <Badge variant="outline" className="text-xs">{acordaos.length}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowAddForm((v) => !v)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Registrar Acórdão
            </Button>
          </div>

          <div className="px-6 py-4 space-y-3">
            {showAddForm && (
              <AddAcordaoForm resolucaoId={id} onClose={() => setShowAddForm(false)} />
            )}

            {acordaosLoading ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : !acordaos || acordaos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum acórdão DICOL registrado para esta RE, no sistema. Caso possuir dados de atualização,
                insira manualmente em "Registrar Acórdão". As informações serão validadas pelo administrador.
              </p>
            ) : (
              <div className="space-y-3">
                {acordaos.map((ac) => (
                  <div
                    key={ac.id}
                    className={`rounded-lg border p-4 ${
                      ac.efeito_suspensivo
                        ? "border-amber-300 bg-amber-50"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Gavel className={`w-4 h-4 shrink-0 ${ac.efeito_suspensivo ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">{ac.numero_acordao}</span>
                        {ac.efeito_suspensivo && (
                          <Badge className="bg-amber-600 text-white text-[10px]">EFEITO SUSPENSIVO</Badge>
                        )}
                        {ac.tipo_decisao && (
                          <Badge variant="outline" className="text-[10px]">
                            {tipoDecisaoLabel[ac.tipo_decisao] ?? ac.tipo_decisao}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {ac.origem_dado === "DOU_SCAN" ? "DOU Scan" : "Manual"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedAcordao(expandedAcordao === ac.id ? null : ac.id)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground"
                          title="Expandir"
                        >
                          {expandedAcordao === ac.id
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteAcordao(ac.id, ac.numero_acordao)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          title="Remover acórdão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>DOU: <strong className="text-foreground">{fmtDate(ac.data_publicacao_dou)}</strong></span>
                      {ac.data_decisao && <span>Decisão: <strong className="text-foreground">{fmtDate(ac.data_decisao)}</strong></span>}
                      {ac.relator && <span>Relator: <strong className="text-foreground">{ac.relator}</strong></span>}
                      {ac.numero_processo && <span>Processo: <strong className="text-foreground font-mono">{ac.numero_processo}</strong></span>}
                    </div>

                    {expandedAcordao === ac.id && (
                      <div className="mt-3 space-y-2">
                        {ac.sumario_decisao && (
                          <div className="text-xs text-foreground bg-white/60 border border-border rounded p-3 leading-relaxed">
                            <p className="font-semibold text-muted-foreground mb-1">Sumário da Decisão</p>
                            {ac.sumario_decisao}
                          </div>
                        )}
                        {ac.link_dou && (
                          <a
                            href={ac.link_dou}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver acórdão no DOU
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historico */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Historico de Alteracoes</h2>
          </div>
          <div className="px-6 py-4">
            {historicoLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : historico?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteracao registrada.</p>
            ) : (
              <div className="space-y-4">
                {historico?.map((entry, idx) => {
                  const isDicol = entry.fonte === "DICOL_ACORDAO";
                  const acordaoData = isDicol && entry.dados_novos
                    ? (entry.dados_novos as Record<string, unknown>)
                    : null;
                  const temEfeitoSusp = acordaoData?.efeito_suspensivo === true;

                  return (
                    <div
                      key={entry.id}
                      className={`pl-4 border-l-2 ${
                        isDicol && temEfeitoSusp
                          ? "border-amber-500"
                          : isDicol
                          ? "border-blue-400"
                          : idx === 0
                          ? "border-primary"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isDicol && <Gavel className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        <span className="text-xs font-medium text-foreground">
                          {entry.alterado_por_nome || "Sistema"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fmtDatetime(entry.created_at)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isDicol && temEfeitoSusp
                              ? "border-amber-400 text-amber-700 bg-amber-50"
                              : isDicol
                              ? "border-blue-300 text-blue-700 bg-blue-50"
                              : ""
                          }`}
                        >
                          {entry.fonte}
                        </Badge>
                        {isDicol && temEfeitoSusp && (
                          <Badge className="text-[10px] bg-amber-600 text-white">EFEITO SUSPENSIVO</Badge>
                        )}
                      </div>
                      {entry.justificativa && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{entry.justificativa}</p>
                      )}
                      {isDicol && !!acordaoData?.link_dou && (
                        <a
                          href={String(acordaoData.link_dou)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver acórdão no DOU
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <a href={`/resolucoes/${re.id}/editar`}>
            <Button variant="outline" size="sm">Editar esta RE</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
