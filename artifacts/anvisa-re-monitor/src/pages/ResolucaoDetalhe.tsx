import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, ExternalLink, Clock, FileText, AlertTriangle, Shield } from "lucide-react";
import { useGetResolucao, useGetResolucaoHistorico } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function ResolucaoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const { data: re, isLoading, isError } = useGetResolucao(id, {
    query: { queryKey: ["resolucao", id] },
  });
  const { data: historico, isLoading: historicoLoading } = useGetResolucaoHistorico(id, {
    query: { enabled: isAuthenticated, queryKey: ["historico", id] },
  });

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
          <Button onClick={() => setLocation("/")}>Voltar ao Portal</Button>
        </div>
      </div>
    );
  }

  const fields = [
    { label: "Numero da RE", value: re.numero_re },
    { label: "Data de Publicacao (DOU)", value: re.data_publicacao ? new Date(re.data_publicacao).toLocaleDateString("pt-BR") : "—" },
    { label: "Vigencia Inicial", value: re.data_vigencia_inicio ? new Date(re.data_vigencia_inicio).toLocaleDateString("pt-BR") : "—" },
    { label: "Vigencia Final", value: re.data_vigencia_fim ? new Date(re.data_vigencia_fim).toLocaleDateString("pt-BR") : "Sem prazo definido" },
    { label: "Categoria do Produto", value: re.tipo_produto?.replace(/_/g, " ") },
    { label: "Principio Ativo", value: re.principio_ativo || "—" },
    { label: "Fabricante", value: re.fabricante_nome || "—" },
    { label: "CNPJ do Fabricante", value: re.fabricante_cnpj || "—" },
    { label: "Numero de Registro ANVISA", value: re.numero_registro_anvisa || "—" },
    { label: "Cadastrado em", value: re.created_at ? new Date(re.created_at).toLocaleDateString("pt-BR") : "—" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <span className="font-semibold text-sm">ANVISA-RE Monitor</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Portal
          </button>
        </Link>

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
                  Suspensao de {acao.charAt(0).toUpperCase() + acao.slice(1).replace(/_/g, " ")}
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

        {/* Historico (only for authenticated users) */}
        {isAuthenticated && (
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
                  {historico?.map((entry, idx) => (
                    <div key={entry.id} className={`pl-4 border-l-2 ${idx === 0 ? "border-primary" : "border-border"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {entry.alterado_por_nome || "Sistema"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{entry.fonte}</Badge>
                      </div>
                      {entry.justificativa && (
                        <p className="text-xs text-muted-foreground">{entry.justificativa}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit button for authenticated users */}
        {isAuthenticated && (
          <div className="flex justify-end mt-4">
            <Link href={`/resolucoes/${re.id}/editar`}>
              <Button variant="outline" size="sm">Editar esta RE</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
