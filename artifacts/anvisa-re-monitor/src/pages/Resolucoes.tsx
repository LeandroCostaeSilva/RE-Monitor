import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, Download, Trash2, Pencil, X, AlertCircle } from "lucide-react";
import {
  useListResolucoes,
  useDeleteResolucao,
  useListCategorias,
  getListResolucoesQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Resolucoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoProdutoFilter, setTipoProdutoFilter] = useState("");
  const [tipoAcaoFilter, setTipoAcaoFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = {
    q: searchQuery || undefined,
    status: statusFilter || undefined,
    tipo_produto: tipoProdutoFilter || undefined,
    tipo_acao: tipoAcaoFilter || undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useListResolucoes(params);
  const { data: categorias } = useListCategorias();
  const deleteMutation = useDeleteResolucao();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "RE excluida com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListResolucoesQueryKey() });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Erro ao excluir RE", variant: "destructive" });
        },
      }
    );
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTipoProdutoFilter("");
    setTipoAcaoFilter("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const hasFilters = statusFilter || tipoProdutoFilter || tipoAcaoFilter || dataInicio || dataFim;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Resolucoes Especificas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestao e consulta de todas as REs cadastradas</p>
        </div>
        <Link href="/resolucoes/nova">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova RE
          </Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome, fabricante, principio ativo, ementa..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm">Buscar</Button>
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasFilters && <span className="bg-white/20 text-xs rounded px-1 ml-1">!</span>}
          </Button>
        </form>

        {showFilters && (
          <div className="border-t border-border pt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="revogada">Revogada</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                  <SelectItem value="em_analise">Em Analise</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoProdutoFilter} onValueChange={(v) => { setTipoProdutoFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as categorias</SelectItem>
                  {categorias?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tipoAcaoFilter} onValueChange={(v) => { setTipoAcaoFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipo de Acao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as acoes</SelectItem>
                  <SelectItem value="comercializacao">Comercializacao</SelectItem>
                  <SelectItem value="importacao">Importacao</SelectItem>
                  <SelectItem value="distribuicao">Distribuicao</SelectItem>
                  <SelectItem value="fabricacao">Fabricacao</SelectItem>
                  <SelectItem value="uso">Uso</SelectItem>
                  <SelectItem value="recolhimento">Recolhimento</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                className="h-8 text-xs"
                placeholder="Data inicio"
              />
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                className="h-8 text-xs"
                placeholder="Data fim"
              />
            </div>
            {hasFilters && (
              <div className="flex justify-end mt-2">
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results info */}
      {data && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{data.total}</span> resolucoes
          </p>
          <p className="text-xs text-muted-foreground">Pagina {data.page} de {data.total_pages}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma resolucao encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Numero RE</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Publicacao</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.data.map((re) => (
                    <tr key={re.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/resolucoes/${re.id}`}>
                          <span className="font-mono text-xs text-primary hover:underline cursor-pointer">{re.numero_re}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm leading-tight">{re.nome_produto}</p>
                          {re.fabricante_nome && (
                            <p className="text-xs text-muted-foreground">{re.fabricante_nome}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground capitalize">{re.tipo_produto?.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {re.data_publicacao ? new Date(re.data_publicacao).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={re.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/resolucoes/${re.id}/editar`}>
                            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => setDeleteId(re.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">{page} / {data.total_pages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}>
                  Proxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao ira excluir logicamente a RE do sistema. O registro sera mantido na base de dados para fins de auditoria, mas nao aparecera mais nas consultas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir RE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
