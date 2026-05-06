import { Router } from "express";

const router = Router();

const CATEGORIAS = [
  {
    id: "medicamentos",
    nome: "Medicamentos",
    descricao: "Medicamentos de referência, novos, específicos, genéricos, similares, biológicos, radiofármacos, fitoterapêuticos",
    exemplos: "Medicamentos de referência, genéricos, similares, biológicos, radiofármacos",
  },
  {
    id: "insumos_farmaceuticos",
    nome: "Insumos Farmacêuticos",
    descricao: "Matérias-primas farmacêuticas, excipientes, embalagens primárias",
    exemplos: "Matérias-primas farmacêuticas, excipientes, embalagens primárias",
  },
  {
    id: "farmacos",
    nome: "Fármacos",
    descricao: "Substâncias farmacológicas sintetizadas com fins terapêuticos",
    exemplos: "Substâncias farmacológicas sintetizadas",
  },
  {
    id: "substancias_ativas",
    nome: "Substâncias Ativas",
    descricao: "Princípios ativos isolados, extratos padronizados",
    exemplos: "Princípios ativos isolados, extratos padronizados",
  },
  {
    id: "alimentos",
    nome: "Alimentos",
    descricao: "Alimentos funcionais, novel foods, suplementos alimentares, alimentos para fins especiais",
    exemplos: "Alimentos funcionais, suplementos alimentares",
  },
  {
    id: "produtos_saude",
    nome: "Produtos para Saúde",
    descricao: "Dispositivos médicos, OPME, diagnóstico in vitro, equipamentos",
    exemplos: "Dispositivos médicos, OPME, diagnóstico in vitro",
  },
  {
    id: "saneantes",
    nome: "Saneantes",
    descricao: "Desinfetantes, esterilizantes, inseticidas domésticos, raticidas",
    exemplos: "Desinfetantes, esterilizantes, inseticidas domésticos",
  },
  {
    id: "cosmeticos",
    nome: "Cosméticos",
    descricao: "Cosméticos grau 1 e 2, produtos de higiene pessoal, perfumes",
    exemplos: "Cosméticos grau 1 e 2, higiene pessoal, perfumes",
  },
  {
    id: "cannabis",
    nome: "Produtos de Cannabis",
    descricao: "Produtos à base de Cannabis sativa L. com fins medicinais",
    exemplos: "Extratos, óleos, fitoterapêuticos com CBD, THC",
  },
  {
    id: "droga_vegetal",
    nome: "Droga Vegetal",
    descricao: "Planta medicinal ou suas partes utilizadas na forma fresca, seca ou rasura",
    exemplos: "Folhas, caules, raízes, flores, frutos, sementes, cascas",
  },
];

const TIPOS_ACAO = [
  { id: "comercializacao", nome: "Suspensão de Comercialização", descricao: "Proibição da comercialização do produto" },
  { id: "importacao", nome: "Suspensão de Importação", descricao: "Proibição da importação do produto" },
  { id: "distribuicao", nome: "Suspensão de Distribuição", descricao: "Proibição da distribuição do produto" },
  { id: "fabricacao", nome: "Suspensão de Fabricação", descricao: "Proibição da fabricação do produto" },
  { id: "uso", nome: "Suspensão de Uso", descricao: "Proibição do uso do produto" },
  { id: "recolhimento", nome: "Recolhimento Obrigatório", descricao: "Recolhimento compulsório do produto do mercado" },
];

// GET /v1/categorias
router.get("/v1/categorias", (_req, res) => {
  return res.json(CATEGORIAS);
});

// GET /v1/tipos-acao
router.get("/v1/tipos-acao", (_req, res) => {
  return res.json(TIPOS_ACAO);
});

export default router;
