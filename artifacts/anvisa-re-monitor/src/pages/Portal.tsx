import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, ChevronRight, X, ExternalLink, AlertCircle } from "lucide-react";
import { useListResolucoes, useListCategorias, useListTiposAcao } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Portal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tipoProdutoFilter, setTipoProdutoFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const params = {
    q: searchQuery || undefined,
    status: statusFilter || undefined,
    tipo_produto: tipoProdutoFilter || undefined,
    page,
    limit: 15,
  };

  const { data, isLoading } = useListResolucoes(params);
  const { data: categorias } = useListCategorias();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTipoProdutoFilter("");
    setPage(1);
  };

  const hasActiveFilters = statusFilter || tipoProdutoFilter;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
              <img src="/logo.png" alt="RE Monitor Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">RE MONITOR</h1>
              <p className="text-xs opacity-75">Consulta Pública de Resoluções - RE ANVISA publicadas em DOU</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Search */}
      <div className="bg-primary/5 border-b border-border py-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Portal de Consulta</p>
            <h2 className="text-2xl font-bold text-foreground">Verifique Resolucoes Sanitarias</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
              Consulte se um produto possui comercializacao, importacao, distribuicao ou fabricacao suspensa por resolucao ANVISA vigente.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nome do produto, fabricante, principio ativo, numero da RE..."
                className="pl-9 h-11 text-sm"
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </form>

          {showFilters && (
            <div className="mt-3 p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Filtros</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os status</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="revogada">Revogada</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                      <SelectItem value="em_analise">Em Analise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Categoria do Produto</label>
                  <Select value={tipoProdutoFilter} onValueChange={(v) => { setTipoProdutoFilter(v === "__all__" ? "" : v); setPage(1); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as categorias</SelectItem>
                      {categorias?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active filters */}
        {(searchQuery || hasActiveFilters) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Busca: {searchQuery}
                <button onClick={() => { setSearchQuery(""); setSearchInput(""); setPage(1); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <button onClick={() => { setStatusFilter(""); setPage(1); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {tipoProdutoFilter && (
              <Badge variant="secondary" className="gap-1">
                Categoria: {tipoProdutoFilter}
                <button onClick={() => { setTipoProdutoFilter(""); setPage(1); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results count */}
        {data && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.total}</span> resolucoes encontradas
            </p>
            <p className="text-xs text-muted-foreground">Pagina {data.page} de {data.total_pages}</p>
          </div>
        )}

        {/* Results list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma resolucao encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Tente ajustar os termos de busca ou filtros</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((re) => (
              <Link key={re.id} href={`/resolucoes/${re.id}`}>
                <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/30 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{re.numero_re}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground capitalize">{re.tipo_produto.replace(/_/g, " ")}</span>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                        {re.nome_produto}
                      </h3>
                      {re.fabricante_nome && (
                        <p className="text-xs text-muted-foreground mt-1">{re.fabricante_nome}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {re.tipo_acao?.map((acao) => (
                          <Badge key={acao} variant="outline" className="text-[10px] py-0">
                            {acao.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={re.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(re.data_publicacao).toLocaleDateString("pt-BR")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {page} / {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
            >
              Proxima
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            ANVISA-RE Monitor — Agencia Nacional de Vigilancia Sanitaria |{" "}
            <a href="https://www.gov.br/anvisa/pt-br" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              gov.br/anvisa <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
