import { useState } from "react";
import { Plus, Search, UserCheck, UserX, Pencil, X, Loader2 } from "lucide-react";
import { useListUsuarios, useCreateUsuario, useUpdateUsuario, getListUsuariosQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

const PERFIL_LABELS: Record<string, string> = {
  administrador: "Administrador",
  fiscal: "Fiscal Sanitario",
  profissional_saude: "Profissional de Saude",
  cidadao: "Cidadao",
};

const PERFIL_COLORS: Record<string, string> = {
  administrador: "bg-purple-100 text-purple-700 border-purple-200",
  fiscal: "bg-blue-100 text-blue-700 border-blue-200",
  profissional_saude: "bg-green-100 text-green-700 border-green-200",
  cidadao: "bg-gray-100 text-gray-600 border-gray-200",
};

interface UsuarioForm {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
}

interface EditForm {
  nome: string;
  perfil: string;
  ativo: boolean;
  senha?: string;
}

export default function Usuarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const { data, isLoading } = useListUsuarios({
    q: searchQuery || undefined,
    page,
    limit: 20,
  });
  const createMutation = useCreateUsuario();
  const updateMutation = useUpdateUsuario();

  const createForm = useForm<UsuarioForm>({
    defaultValues: { nome: "", email: "", senha: "", perfil: "fiscal" },
  });
  const editForm = useForm<EditForm>({
    defaultValues: { nome: "", perfil: "fiscal", ativo: true, senha: "" },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleCreate = (data: UsuarioForm) => {
    createMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Usuario criado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });
          createForm.reset();
          setShowCreate(false);
        },
        onError: (err: any) => {
          toast({ title: err?.data?.error || "Erro ao criar usuario", variant: "destructive" });
        },
      }
    );
  };

  const handleEdit = (data: EditForm) => {
    if (!editingUser) return;
    const payload: any = { nome: data.nome, perfil: data.perfil, ativo: data.ativo };
    if (data.senha) payload.senha = data.senha;
    updateMutation.mutate(
      { id: editingUser.id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Usuario atualizado com sucesso" });
          queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });
          setEditingUser(null);
        },
        onError: () => {
          toast({ title: "Erro ao atualizar usuario", variant: "destructive" });
        },
      }
    );
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    editForm.reset({ nome: user.nome, perfil: user.perfil, ativo: user.ativo, senha: "" });
  };

  const toggleStatus = (user: any) => {
    updateMutation.mutate(
      { id: user.id, data: { ativo: !user.ativo } },
      {
        onSuccess: () => {
          toast({ title: user.ativo ? "Usuario desativado" : "Usuario reativado" });
          queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestao de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e gerenciamento de usuarios do sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Usuario
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button type="submit" size="sm">Buscar</Button>
        {searchQuery && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSearchInput(""); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Ultimo Acesso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{user.nome}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${PERFIL_COLORS[user.perfil] || "bg-gray-100 text-gray-600"}`}>
                      {PERFIL_LABELS[user.perfil] || user.perfil}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {user.ultimo_acesso ? new Date(user.ultimo_acesso as string).toLocaleDateString("pt-BR") : "Nunca"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.ativo ? "default" : "secondary"} className="text-xs">
                      {user.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user)}
                        className={`p-1.5 rounded transition-colors ${user.ativo ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-600"} text-muted-foreground`}
                      >
                        {user.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
            <span className="text-xs text-muted-foreground">{page} / {data.total_pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}>Proxima</Button>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input {...createForm.register("nome", { required: true })} className="text-sm" placeholder="Nome do usuario" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email institucional</Label>
              <Input type="email" {...createForm.register("email", { required: true })} className="text-sm" placeholder="usuario@anvisa.gov.br" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha inicial</Label>
              <Input type="password" {...createForm.register("senha", { required: true })} className="text-sm" placeholder="Senha temporaria" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Perfil de acesso</Label>
              <Select value={createForm.watch("perfil")} onValueChange={(v) => createForm.setValue("perfil", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador ANVISA</SelectItem>
                  <SelectItem value="fiscal">Fiscal Sanitario</SelectItem>
                  <SelectItem value="profissional_saude">Profissional de Saude</SelectItem>
                  <SelectItem value="cidadao">Cidadao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Criando...</> : "Criar Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input {...editForm.register("nome")} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Perfil de acesso</Label>
              <Select value={editForm.watch("perfil")} onValueChange={(v) => editForm.setValue("perfil", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador ANVISA</SelectItem>
                  <SelectItem value="fiscal">Fiscal Sanitario</SelectItem>
                  <SelectItem value="profissional_saude">Profissional de Saude</SelectItem>
                  <SelectItem value="cidadao">Cidadao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nova senha (opcional)</Label>
              <Input type="password" {...editForm.register("senha")} className="text-sm" placeholder="Deixe vazio para manter a atual" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Salvar Alteracoes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
