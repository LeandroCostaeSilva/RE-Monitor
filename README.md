# RE Monitor — ANVISA Specific Resolutions Monitoring System

<p align="center">
  <img src="artifacts/anvisa-re-monitor/public/logo.png" alt="RE Monitor Logo" width="80" />
</p>

<p align="center">
  <strong>Sistema profissional de monitoramento e gestão de Resoluções Específicas (REs) da ANVISA publicadas no Diário Oficial da União.</strong>
</p>

<p align="center">
  <a href="#visão-geral">Visão Geral</a> •
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#stack-tecnológica">Stack</a> •
  <a href="#estrutura-do-projeto">Estrutura</a> •
  <a href="#como-executar">Como Executar</a> •
  <a href="#api">API</a> •
  <a href="#contato">Contato</a>
</p>

---

## Visão Geral

O **RE Monitor** é uma plataforma web governamental desenvolvida para o monitoramento, consulta pública e gestão administrativa das **Resoluções Específicas (REs)** emitidas pela ANVISA — Agência Nacional de Vigilância Sanitária. Essas resoluções determinam a suspensão da comercialização, importação, distribuição ou fabricação de produtos de saúde com irregularidades identificadas.

O sistema integra consulta pública aberta à população, painel de gestão interno para fiscais sanitários, sincronização automática com o Diário Oficial da União (DOU) via IA, e rastreamento de decisões da Diretoria Colegiada (DICOL) com efeito suspensivo sobre medidas sanitárias ativas.

---

## Funcionalidades

### 🔍 Portal Público (`/`)
- Busca e filtragem de todas as REs cadastradas por produto, fabricante, status, categoria e período
- Exibição de badges de status: **Vigente**, **Revogada**, **Encerrada**, **Em Análise**
- Página de detalhes por RE com ementa completa, metadados, histórico de alterações e acórdãos DICOL
- Alerta visual destacado quando há efeito suspensivo conferido pela Diretoria Colegiada

### 📊 Dashboard (`/dashboard`)
- Indicadores KPI em tempo real: total de REs, vigentes, revogadas, encerradas e em análise
- Gráficos de barras por categoria de produto e gráfico de pizza por status
- Lista das REs registradas mais recentemente

### 📋 Gestão de Resoluções (`/resolucoes`)
- CRUD completo de Resoluções Específicas com busca, filtros múltiplos e ordenação
- Registro com todos os campos: número da RE, produto, fabricante, tipo de ação, vigência, ementa, link DOU
- Histórico de auditoria por RE (log de todas as alterações com snapshot antes/depois)
- Exclusão lógica (soft delete) — nenhum dado é removido permanentemente

### 📁 Acórdãos DICOL por RE (metadados)
- Registro manual de acórdãos da Diretoria Colegiada vinculados a cada RE
- Campos: número do acórdão, processo, data DOU, data da decisão, tipo de decisão, relator, sumário, link DOU
- Flag de **efeito suspensivo**: quando ativada, atualiza o status da RE para *Em Análise* e exibe banner de alerta na página pública
- Todas as inserções são registradas no histórico de auditoria com fonte `DICOL_ACORDAO`

### 📈 Relatórios (`/relatorios`)
- Relatórios mensais com gráficos de novas REs por mês
- Exportação nos formatos **CSV**, **XLSX** e **PDF**

### 🔄 Sincronização com o DOU (`/sincronizacao`)
- **Sincronização Manual**: busca REs publicadas no DOU em um intervalo de datas (máx. 90 dias), usando multi-estratégia de coleta (API JSON, RSS Seção 3, API AJAX e listagem ANVISA.gov.br)
- **Backfill Completo**: reprocessa todo o histórico desde janeiro/2020, mês a mês em background
- **Importação Manual por Texto**: cole o texto bruto do DOU ou PDF convertido para extração via IA (GPT)
- **Varredura DICOL**: varre o DOU em busca de acórdãos da Diretoria Colegiada com efeito suspensivo sobre medidas sanitárias, vinculando automaticamente às REs cadastradas
- Job diário automático às 07h (horário de Brasília) para capturar publicações do dia anterior
- Histórico completo de sincronizações com estatísticas de execução

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Gráficos | Recharts |
| Roteamento (client) | Wouter |
| Estado assíncrono | TanStack React Query |
| Backend | Node.js 24 + Express 5 |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Validação | Zod v4 + drizzle-zod |
| Contrato de API | OpenAPI 3.0 (Orval codegen) |
| IA / Extração | OpenAI GPT (parsing de texto DOU) |
| Logging | Pino |
| Build | esbuild |
| Monorepo | pnpm workspaces |

---

## Estrutura do Projeto

```
RE-Monitor/
├── artifacts/
│   ├── anvisa-re-monitor/      # Frontend React + Vite (porta 20622 → /)
│   └── api-server/             # Backend Express (porta 8080 → /api)
├── lib/
│   ├── api-spec/               # Contrato OpenAPI + config Orval (codegen)
│   ├── api-client-react/       # Hooks React Query gerados automaticamente
│   ├── api-zod/                # Schemas Zod gerados automaticamente
│   └── db/                     # Schema Drizzle ORM + migrations
└── scripts/                    # Utilitários de linha de comando
```

### Tabelas do banco de dados

| Tabela | Descrição |
|--------|-----------|
| `resolucoes_especificas` | REs com soft delete e todos os metadados |
| `acordaos_dicol` | Acórdãos da Diretoria Colegiada vinculados a cada RE |
| `resolucoes_historico` | Log de auditoria com snapshots JSON antes/depois |
| `usuarios` | Usuários do sistema (schema mantido, auth desabilitada) |

---

## Como Executar

### Pré-requisitos
- Node.js 24+
- pnpm 9+
- PostgreSQL (ou Replit Database)

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variável de ambiente
export DATABASE_URL="postgresql://user:password@localhost:5432/re_monitor"

# Aplicar schema no banco
pnpm --filter @workspace/db run push

# Iniciar API (porta 8080)
pnpm --filter @workspace/api-server run dev

# Iniciar frontend (porta 20622)
pnpm --filter @workspace/anvisa-re-monitor run dev
```

### Codegen (após alterar o OpenAPI spec)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typecheck completo

```bash
pnpm run typecheck
```

---

## API

A API segue o padrão REST com contrato OpenAPI. Todos os endpoints estão sob o prefixo `/api/v1/`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/v1/resolucoes` | Listar REs com filtros e paginação |
| `POST` | `/v1/resolucoes` | Criar nova RE |
| `GET` | `/v1/resolucoes/:id` | Detalhe de uma RE |
| `PUT` | `/v1/resolucoes/:id` | Atualizar RE |
| `DELETE` | `/v1/resolucoes/:id` | Excluir RE (soft delete) |
| `GET` | `/v1/resolucoes/:id/historico` | Histórico de auditoria |
| `GET` | `/v1/resolucoes/:id/acordaos` | Acórdãos DICOL da RE |
| `POST` | `/v1/resolucoes/:id/acordaos` | Registrar acórdão DICOL |
| `DELETE` | `/v1/resolucoes/:resolucaoId/acordaos/:acordaoId` | Remover acórdão |
| `POST` | `/v1/acordaos/sync-dou` | Varredura automática do DOU (DICOL) |
| `POST` | `/v1/sync/dou` | Sincronizar REs do DOU |
| `POST` | `/v1/sync/texto` | Importar RE por texto com IA |
| `POST` | `/v1/sync/backfill` | Backfill histórico |
| `GET` | `/v1/sync/historico` | Histórico de sincronizações |
| `GET` | `/v1/dashboard/stats` | Estatísticas do dashboard |
| `GET` | `/v1/relatorios/mensal` | Relatório mensal |
| `GET` | `/v1/relatorios/exportar` | Exportar CSV/XLSX/PDF |

---

## Decisões de Arquitetura

- **Sem autenticação no frontend**: todas as rotas são abertas. A gestão e manutenção dos dados é feita diretamente pelo administrador do sistema.
- **Soft delete**: REs nunca são removidas fisicamente — utiliza-se a coluna `deleted_at`.
- **Auditoria completa**: cada alteração em uma RE gera um registro em `resolucoes_historico` com snapshot JSON do estado anterior e posterior.
- **Contrato-first**: o OpenAPI spec é a fonte de verdade. Hooks React Query e schemas Zod são gerados por codegen (Orval), garantindo consistência entre frontend e backend.
- **IA para parsing**: o texto bruto do DOU pode ser enviado para extração estruturada via GPT, tornando o sistema robusto mesmo quando o acesso automatizado ao DOU é bloqueado.

---

## Contato

📧 [remonitoronline@gmail.com](mailto:remonitoronline@gmail.com)

---

<p align="center">
  Desenvolvido para apoiar a fiscalização sanitária brasileira — ANVISA RE Monitor &copy; 2025
</p>
