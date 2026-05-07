# ANVISA-RE Monitor

A professional Brazilian government web system for managing ANVISA Specific Resolutions (REs) that suspend the commercialization, importation, distribution, or manufacturing of health products.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/anvisa-re-monitor run dev` — Frontend (port 20622, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — kept for compatibility but auth is disabled; all routes are open

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS + shadcn/ui components + Recharts + React Query + Wouter routing
- API: Express 5 + Pino logger
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT via `jsonwebtoken` (SHA-256 password hashing with Node crypto)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all API shapes)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (must only export from `./generated/api`)
- `lib/db/src/schema/index.ts` — DB schema exports (`resolucoesEspecificas`, `usuarios`, `resolucoes_historico`)
- `artifacts/api-server/src/routes/` — all route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware (`requireAuth`, `optionalAuth`, `requirePerfil`)
- `artifacts/anvisa-re-monitor/src/pages/` — all frontend pages
- `artifacts/anvisa-re-monitor/src/contexts/AuthContext.tsx` — auth state + JWT token management

## Architecture decisions

- **No authentication**: All routes are open — no login required. Maintenance and data management are done directly via Replit.
- **Soft delete**: REs use `deleted_at` column (never physically deleted); all queries filter `isNull(deleted_at)`.
- **Audit log**: Every RE create/update/delete creates a record in `resolucoes_historico` with before/after JSON snapshots (alterado_por is null since there's no auth).
- **No bcrypt**: Passwords hashed with SHA-256 via Node `crypto` — kept in schema but unused for UI auth.
- **Unified layout**: All pages use the same sidebar layout. `/` is the public search portal; `/dashboard`, `/resolucoes`, `/relatorios`, `/sincronizacao` are accessible directly.

## Product

- **Portal** (`/`): searchable, filterable list of all REs with status badges; detail page with audit history
- **Dashboard** (`/dashboard`): KPI stats, bar/pie charts by category and status, recent REs list
- **RE management** (`/resolucoes`): full CRUD with search, multi-filter, sort, audit history
- **Reports** (`/relatorios`): monthly reports with charts, CSV/XLSX/PDF export
- **DOU Sync** (`/sincronizacao`): manual sync trigger, AI-powered text import, backfill, sync history

## User preferences

- Stack: React+Vite frontend, Node.js/Express backend (NOT Python), PostgreSQL built-in DB
- Full PRD at `attached_assets/ANVISA_RE_Monitor_PRD_v1.3_1778088798287.pdf`

## Gotchas

- After running codegen (`pnpm --filter @workspace/api-spec run codegen`), check `lib/api-zod/src/index.ts` — it must only contain `export * from "./generated/api";`
- API server must be **restarted** after adding new routes (it runs a build step); use `restart_workflow "artifacts/api-server: API Server"`
- No authentication on any route — all API endpoints are open
- `tipo_acao` is stored as `text[]` array in PostgreSQL
- Status enum: `vigente` (red), `revogada` (gray), `encerrada` (blue), `em_analise` (orange)
- OpenAI model `gpt-5-mini` does NOT support `temperature` parameter — omit it

## Pointers

- See `.local/skills/pnpm-workspace/` for workspace structure, TypeScript setup, and package details
- See `.local/skills/react-vite/` for React+Vite conventions
