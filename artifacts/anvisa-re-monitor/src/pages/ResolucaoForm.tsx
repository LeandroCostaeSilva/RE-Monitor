import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetResolucao,
  useCreateResolucao,
  useUpdateResolucao,
  useListCategorias,
  useListTiposAcao,
  getListResolucoesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  numero_re: z.string().min(1, "Numero da RE e obrigatorio"),
  data_publicacao: z.string().min(1, "Data de publicacao e obrigatoria"),
  data_vigencia_inicio: z.string().min(1, "Data de vigencia e obrigatoria"),
  data_vigencia_fim: z.string().optional(),
  status: z.string().min(1, "Status e obrigatorio"),
  tipo_produto: z.string().min(1, "Categoria do produto e obrigatoria"),
  tipo_acao: z.array(z.string()).min(1, "Selecione ao menos um tipo de acao"),
  nome_produto: z.string().min(1, "Nome do produto e obrigatorio"),
  principio_ativo: z.string().optional(),
  fabricante_nome: z.string().optional(),
  fabricante_cnpj: z.string().optional(),
  numero_registro_anvisa: z.string().optional(),
  ementa: z.string().min(1, "Ementa e obrigatoria"),
  link_documento_oficial: z.string().optional(),
  justificativa_alteracao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  params: { id?: string };
  mode: "create" | "edit";
}

const TIPOS_ACAO = [
  { id: "comercializacao", label: "Suspensao de Comercializacao" },
  { id: "importacao", label: "Suspensao de Importacao" },
  { id: "distribuicao", label: "Suspensao de Distribuicao" },
  { id: "fabricacao", label: "Suspensao de Fabricacao" },
  { id: "uso", label: "Suspensao de Uso" },
  { id: "recolhimento", label: "Recolhimento Obrigatorio" },
];

export default function ResolucaoForm({ params, mode }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = params.id;

  const { data: existingRe } = useGetResolucao(id!, {
    query: { enabled: mode === "edit" && !!id, queryKey: ["resolucao", id!] },
  });
  const { data: categorias } = useListCategorias();
  const createMutation = useCreateResolucao();
  const updateMutation = useUpdateResolucao();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_re: "",
      data_publicacao: "",
      data_vigencia_inicio: "",
      data_vigencia_fim: "",
      status: "vigente",
      tipo_produto: "",
      tipo_acao: [],
      nome_produto: "",
      principio_ativo: "",
      fabricante_nome: "",
      fabricante_cnpj: "",
      numero_registro_anvisa: "",
      ementa: "",
      link_documento_oficial: "",
      justificativa_alteracao: "",
    },
  });

  useEffect(() => {
    if (existingRe && mode === "edit") {
      form.reset({
        numero_re: existingRe.numero_re,
        data_publicacao: existingRe.data_publicacao || "",
        data_vigencia_inicio: existingRe.data_vigencia_inicio || "",
        data_vigencia_fim: existingRe.data_vigencia_fim || "",
        status: existingRe.status,
        tipo_produto: existingRe.tipo_produto,
        tipo_acao: existingRe.tipo_acao || [],
        nome_produto: existingRe.nome_produto,
        principio_ativo: existingRe.principio_ativo || "",
        fabricante_nome: existingRe.fabricante_nome || "",
        fabricante_cnpj: existingRe.fabricante_cnpj || "",
        numero_registro_anvisa: existingRe.numero_registro_anvisa || "",
        ementa: existingRe.ementa,
        link_documento_oficial: existingRe.link_documento_oficial || "",
        justificativa_alteracao: "",
      });
    }
  }, [existingRe, mode, form]);

  const tipoAcaoValue = form.watch("tipo_acao") || [];

  const toggleTipoAcao = (value: string) => {
    const current = tipoAcaoValue;
    if (current.includes(value)) {
      form.setValue("tipo_acao", current.filter((v) => v !== value));
    } else {
      form.setValue("tipo_acao", [...current, value]);
    }
  };

  const onSubmit = (data: FormData) => {
    if (mode === "create") {
      createMutation.mutate(
        { data: data as any },
        {
          onSuccess: (created) => {
            toast({ title: "RE cadastrada com sucesso" });
            queryClient.invalidateQueries({ queryKey: getListResolucoesQueryKey() });
            setLocation(`/resolucoes/${created.id}`);
          },
          onError: (err: any) => {
            toast({
              title: "Erro ao cadastrar RE",
              description: err?.data?.error || "Verifique os dados e tente novamente.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      updateMutation.mutate(
        { id: id!, data: data as any },
        {
          onSuccess: () => {
            toast({ title: "RE atualizada com sucesso" });
            queryClient.invalidateQueries({ queryKey: getListResolucoesQueryKey() });
            setLocation(`/resolucoes/${id}`);
          },
          onError: (err: any) => {
            toast({
              title: "Erro ao atualizar RE",
              description: err?.data?.error || "Verifique os dados e tente novamente.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => setLocation("/resolucoes")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Resolucoes
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Cadastrar Nova RE" : "Editar Resolucao"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "create"
            ? "Preencha os dados da nova Resolucao Especifica"
            : `Editando: ${existingRe?.numero_re || "..."}`}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificacao */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Identificacao da RE</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Numero da RE <span className="text-destructive">*</span></Label>
              <Input
                {...form.register("numero_re")}
                placeholder="Ex: RE n 3.746/2023"
                disabled={mode === "edit"}
                className="text-sm"
              />
              {form.formState.errors.numero_re && (
                <p className="text-xs text-destructive">{form.formState.errors.numero_re.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status <span className="text-destructive">*</span></Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="revogada">Revogada</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                  <SelectItem value="em_analise">Em Analise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data de Publicacao (DOU) <span className="text-destructive">*</span></Label>
              <Input type="date" {...form.register("data_publicacao")} className="text-sm" />
              {form.formState.errors.data_publicacao && (
                <p className="text-xs text-destructive">{form.formState.errors.data_publicacao.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data de Vigencia Inicial <span className="text-destructive">*</span></Label>
              <Input type="date" {...form.register("data_vigencia_inicio")} className="text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data de Vigencia Final</Label>
              <Input type="date" {...form.register("data_vigencia_fim")} className="text-sm" />
              <p className="text-[10px] text-muted-foreground">Deixe vazio para vigencia sem prazo definido</p>
            </div>
          </CardContent>
        </Card>

        {/* Produto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Dados do Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Nome do Produto <span className="text-destructive">*</span></Label>
                <Input {...form.register("nome_produto")} placeholder="Nome comercial e/ou generico" className="text-sm" />
                {form.formState.errors.nome_produto && (
                  <p className="text-xs text-destructive">{form.formState.errors.nome_produto.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Categoria do Produto <span className="text-destructive">*</span></Label>
                <Select value={form.watch("tipo_produto")} onValueChange={(v) => form.setValue("tipo_produto", v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tipo_produto && (
                  <p className="text-xs text-destructive">{form.formState.errors.tipo_produto.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Principio Ativo / Substancia Ativa</Label>
                <Input {...form.register("principio_ativo")} placeholder="INN ou DCB" className="text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Numero de Registro ANVISA</Label>
                <Input {...form.register("numero_registro_anvisa")} placeholder="Ex: 1.0800.0001.001-3" className="text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipos de Acao Sanitaria <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TIPOS_ACAO.map((acao) => (
                  <div key={acao.id} className="flex items-center gap-2">
                    <Checkbox
                      id={acao.id}
                      checked={tipoAcaoValue.includes(acao.id)}
                      onCheckedChange={() => toggleTipoAcao(acao.id)}
                    />
                    <label htmlFor={acao.id} className="text-xs cursor-pointer">{acao.label}</label>
                  </div>
                ))}
              </div>
              {form.formState.errors.tipo_acao && (
                <p className="text-xs text-destructive">{form.formState.errors.tipo_acao.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fabricante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Dados do Fabricante</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Razao Social do Fabricante</Label>
              <Input {...form.register("fabricante_nome")} placeholder="Nome completo do fabricante" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ do Fabricante</Label>
              <Input {...form.register("fabricante_cnpj")} placeholder="00.000.000/0001-00" className="text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Ementa e documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Ementa e Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Ementa / Motivacao da Suspensao <span className="text-destructive">*</span></Label>
              <Textarea
                {...form.register("ementa")}
                placeholder="Descricao detalhada da motivacao da suspensao..."
                rows={4}
                className="text-sm resize-none"
              />
              {form.formState.errors.ementa && (
                <p className="text-xs text-destructive">{form.formState.errors.ementa.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Link para Documento Oficial (DOU/ANVISA)</Label>
              <Input {...form.register("link_documento_oficial")} placeholder="https://www.in.gov.br/..." className="text-sm" />
            </div>

            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Justificativa da Alteracao</Label>
                <Textarea
                  {...form.register("justificativa_alteracao")}
                  placeholder="Descreva o motivo da edicao para fins de auditoria..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/resolucoes")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4" /> {mode === "create" ? "Cadastrar RE" : "Salvar Alteracoes"}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
