# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from repo root (pnpm workspaces). `@ledger/shared` must be built before `apps/*` because it emits both ESM and CJS artifacts consumed by web (ESM) and api (CJS) — the root `dev`/`build` scripts already do this.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Build `@ledger/shared`, then run api (`nest start --watch`, :3001) and web (`vite`, :5173) in parallel |
| `pnpm build` | Build shared, then both apps |
| `pnpm lint` | ESLint across both apps |
| `pnpm format` | Prettier over `apps/**/src` and `packages/**/src` |
| `pnpm db:migrate` | `prisma migrate dev` (creates + applies migration, regenerates client) |
| `pnpm db:seed` | Runs `apps/api/prisma/seed.ts` via tsx — seeds banks, accounts, categories, classification rules |
| `pnpm db:studio` | Opens Prisma Studio |
| `docker compose up -d` | Starts Postgres 16 on host port **5434** (mapped to container 5432), user/pass/db all `ledger` |

Per-app scripts (run with `pnpm --filter @ledger/api <script>` or `--filter @ledger/web`):
- api: `dev`, `build`, `start` (runs `dist/main.js`), `lint`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:seed`, `prisma:studio`
- web: `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`

No test runner is configured.

### Env

`apps/api/.env` must define `DATABASE_URL`. Copy from `apps/api/.env.example`. Optional: `PORT` (default 3001), `WEB_ORIGIN` (CORS, default `http://localhost:5173`). Web reads `VITE_API_URL` (default `http://localhost:3001`).

## Architecture

Monorepo with three workspaces: `apps/api` (NestJS), `apps/web` (React+Vite+MUI), `packages/shared` (TS enums + DTOs shared by both).

### Shared package is the contract

`packages/shared/src/index.ts` is the single source of truth for enums (`Direction`, `TransactionType`, `TransactionNature`, `AssetType`, `ProfitRateType`, `AccountType`) and DTO interfaces. Prisma's `schema.prisma` re-declares matching enums — **they must be kept in sync manually**. Any enum change requires: update shared → rebuild shared → update `schema.prisma` → `pnpm db:migrate`.

The package ships dual-format (`tsconfig.esm.json` + `tsconfig.cjs.json`). Both apps import from `@ledger/shared` via workspace protocol.

### API (NestJS + Prisma)

Modules in `apps/api/src`, one per resource: `banks`, `accounts`, `categories`, `classification-rules`, `transactions`, `assets`, `imports`, `dashboard`, plus `health` and `prisma` (global module wrapping `PrismaClient`). Each resource module has controller + service + dto, standard NestJS shape. Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` in `main.ts`.

### Core domain model

`Bank → Account → Transaction`. `Category` is self-referential (`parentId`) for two-level hierarchies (e.g. Moradia > Aluguel). `ClassificationRule` (pattern + priority + categoryId) auto-categorizes transactions by substring match on the normalized description. `Asset` tracks wealth positions independently of transactions. `ImportBatch` tracks CSV imports and links the transactions it created.

Critical `Transaction` fields:
- `descriptionNormalized`: NFD-stripped, uppercased, whitespace-collapsed (see `common/normalize.ts`). All rule matching uses this.
- `competenceMonth`: `YYYY-MM` string, indexed. Dashboard queries filter on this instead of date range.
- `fingerprint`: `sha256(accountId|YYYY-MM-DD|absAmount|descriptionNormalized)`, `@unique`. CSV imports check this to skip duplicates.
- `impactsDashboardIncome` / `impactsDashboardExpense` / `impactsAccountBalance`: flags that let transactions exist but be excluded from aggregates (e.g. historical imports, internal transfers).
- `nature` (INCOME/EXPENSE/INTERNAL_TRANSFER/INVESTMENT/REDEMPTION/REIMBURSEMENT): finer-grained than `direction`, drives dashboard flag defaults.

### CSV import flow (`imports.service.ts`)

1. Parse CSV with `csv-parse/sync`, lowercased trimmed headers. Column detection via `common/csv-parsing.ts` pickers — tolerates multiple header names for date/description/amount.
2. If statement's max date < account's existing max transaction date → mark batch `historical: true`, set `impactsAccountBalance: false` on all imported rows (so re-importing old statements doesn't double-count).
3. For each row: normalize description → build fingerprint → skip if fingerprint exists (`duplicated++`) → find first matching rule ordered by priority → if none, `needsReview++` → insert transaction linked to the import batch.
4. Amount sign determines `direction`: `>= 0 INCOME`, else `EXPENSE`. Stored amount is always positive (`Math.abs`).

Rule matching (in imports and in `POST /transactions/reclassify`) uses `descriptionNormalized.includes(normalizeDescription(rule.pattern))` — patterns are case- and accent-insensitive substrings, not regex. Both sides must go through `normalizeDescription` (NFD-strip + uppercase); comparing a raw/uppercased-only pattern against an accent-stripped description silently matches nothing.

### Web (React)

`main.tsx` wires QueryClientProvider + MUI ThemeProvider + BrowserRouter. `App.tsx` defines routes under a single `Layout`: `/dashboard`, `/transactions`, `/accounts`, `/assets`, `/categories`, `/rules`, `/imports`, `/settings`. All API calls go through `src/api/client.ts` (axios, baseURL from `VITE_API_URL`). Data fetching uses `@tanstack/react-query`. UI is in Portuguese (pt-BR) — match existing copy when adding strings.

### Endpoints

Standard REST CRUD for each resource module. Notable non-CRUD:
- `POST /imports/csv` — multipart, field `file`, body `accountId` (+ optional `initialBalance`, `endBalance`). Returns `{ imported, duplicated, needsReview, historical }`.
- `GET /dashboard/summary?month=YYYY-MM` — aggregates by category + account, computes `netWorth = totalAccountsBalance + totalAssetsValue`.
- `GET /transactions` supports filters: account, category, month (competenceMonth), direction.
