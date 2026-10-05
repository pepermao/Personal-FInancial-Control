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
| `pnpm test` | Runs Vitest in both apps (`--recursive`) |
| `docker compose up -d` | Starts Postgres 16 on host port **5434** (mapped to container 5432), user/pass/db all `ledger` |

Per-app scripts (run with `pnpm --filter @ledger/api <script>` or `--filter @ledger/web`):
- api: `dev`, `build`, `start` (runs `dist/main.js`), `lint`, `test`, `test:watch`, `test:coverage`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:seed`, `prisma:studio`
- web: `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`, `test`, `test:watch`, `test:coverage`

## Testing (Vitest)

Both apps use **Vitest 2** (pinned to `^2` — Vitest 4 requires Vite 6, we're on Vite 5).

- **Configs**: `apps/api/vitest.config.ts` (node env), `apps/web/vitest.config.ts` (jsdom env + `@vitejs/plugin-react`).
- **File glob**: `src/**/*.{test,spec}.{ts,tsx}` — colocate tests next to source.
- **Globals enabled**: `describe`, `it`, `expect` available without imports (but existing samples import them explicitly).
- **Coverage**: `@vitest/coverage-v8` — run `pnpm --filter @ledger/api test:coverage` (or `--filter @ledger/web`).

### Run

```bash
pnpm test                                    # both apps, in parallel
pnpm --filter @ledger/api test               # single app
pnpm --filter @ledger/web test:watch         # watch mode
pnpm --filter @ledger/api test:coverage      # + coverage report
```

### Add a test

Create `foo.test.ts` (or `.tsx` for React) next to the module. Example:

```ts
// apps/api/src/common/foo.test.ts
import { describe, expect, it } from 'vitest';
import { foo } from './foo';

describe('foo', () => {
  it('returns 42', () => {
    expect(foo()).toBe(42);
  });
});
```

Existing samples to model against:
- `apps/api/src/common/category-kind.test.ts` — pure unit test of `impactOf`
- `apps/api/src/common/normalize.test.ts` — `normalizeDescription` + `buildFingerprint`
- `apps/web/src/utils/format.test.ts` — `formatBRL` (uses `.replace(/\s/g, ' ')` to normalize NBSPs before matching, since ICU output varies)

For React component tests, add `@testing-library/react` + `@testing-library/jest-dom` — not installed yet.

### Env

`apps/api/.env` must define `DATABASE_URL`. Copy from `apps/api/.env.example`. Optional: `PORT` (default 3001), `WEB_ORIGIN` (CORS, default `http://localhost:5173`). Web reads `VITE_API_URL` (default `http://localhost:3001`).

Open Finance sync needs `PLUGGY_CLIENT_ID` and `PLUGGY_CLIENT_SECRET`. Item IDs are **not** configured: they are captured by the Connect widget and stored in `pluggy_connections`. `PLUGGY_ITEM_IDS` still works as a fallback when that table is empty, for installs that predate the widget. Without credentials `GET /open-finance/status` reports `configured: false` and sync refuses to run — nothing else is affected.

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

### Open Finance sync (`open-finance/`)

Pluggy is a **second importer**, not a second data model — it reuses `Account`, `Transaction`, `ImportBatch` and the classification rules.

**Connections** (`pluggy-connections.service.ts`) own the item lifecycle, kept apart from sync because a connection is established once and read many times. The flow mirrors how Pluggy intends it:

1. `POST /open-finance/connect-token` mints a 30-minute token.
2. The browser opens Pluggy's widget (`react-pluggy-connect`) with it; the user picks a connector and authorises.
3. `onSuccess` returns the **Item ID** — `POST /open-finance/connections` reads `/items/{id}` for the connector name and persists a `PluggyConnection`.

This exists because **`GET /items` is a paid-plan feature**: an item can only be learned at the moment it is authorised, so it has to be captured then and stored. `POST /open-finance/connections/:id/reconnect-token` reopens the widget in update mode, which is how a consent that hit its 12-month ceiling is renewed without losing the item and the history keyed to it.

`POST /open-finance/sync` then walks each registered item:

1. `GET /accounts?itemId=` → link each Pluggy account to a Kevin account by `pluggyAccountId`. First sync creates the bank and account, or adopts an existing `bank+name` match **that is not already linked to another Pluggy account**, so CSV history stays on one timeline.
2. Open one `ImportBatch` per account with `endBalance` set to Pluggy's reported balance. That makes the batch a **bank-truth anchor** (see `accounts.service.ts`), which is what keeps balances correct even though Open Finance only exposes 12 months of history. A batch with **zero** transactions still anchors — it falls back to the batch's `createdAt`, because an account with no movement in the window still reports a real balance.
3. `GET /v2/transactions` by cursor → skip `PENDING` rows → dedupe on `pluggyTransactionId` → apply rules → insert.
4. `GET /investments?itemId=` → upsert `Asset` by `pluggyInvestmentId`, including `issuer` and `dueDate`.

Seven things are easy to get wrong here:

- **Direction comes from Pluggy's `type`, never the sign of `amount`.** Credit cards report a purchase as positive; bank accounts report an outflow as negative. `type` is DEBIT/CREDIT on both. See `mapDirection`.
- **`PENDING` transactions are skipped.** Their amount and description can still change, and Pluggy's own docs warn that transaction IDs change when core attributes shift — importing them would produce a second fingerprint once they post.
- **`GET /items` listing is a paid-plan feature**, though `GET /items/{id}` is not. Items cannot be enumerated, only captured at authorisation time — hence the `pluggy_connections` table.
- **Dedupe is by `pluggyTransactionId`, never by fingerprint.** `accountId|date|amount|description` cannot distinguish genuinely repeated purchases — three coffees at the same shop on the same day at the same price share one fingerprint but are three real transactions. The Pluggy id is folded into the fingerprint only to satisfy its unique constraint, which means a Pluggy row will not dedupe against a CSV row for the same purchase: feed any one account from a single importer, not both.
- **`pageSize` is a v1 parameter.** `/v2/transactions` rejects it with HTTP 400; the cursor endpoint sets its own page size.
- **A MeuPluggy item is frozen at creation.** `PATCH /items/{id}` answers `400 MeuPluggy item cant be updated`, and the item only ever exposes the Meu Pluggy connections that existed when it was made. Linking a new bank at meu.pluggy.ai therefore needs a **new item** through the widget — one item per connection, not one per account.
- **Bank names come from the COMPE code, resolved once per item.** `connector.name` is always "MeuPluggy" on a proxied item, and the account's own `marketingName` is a product ("croma-platinum", "… (Conta Pré-paga)"), so neither names an institution. `institutionFor()` takes the first known COMPE in the item via `pluggy-institutions.ts`; every account in that item shares it, which is what files a credit card — it carries no COMPE — under its own bank. Sync repoints accounts whose bank was resolved differently before, then prunes banks left empty.
- **Two accounts can share a name and a number.** XP reports `name: "XP"`, `number: "01946356-6"` for both Banco XP (COMPE 348) and XP Investimentos (COMPE 102). `resolveAccount` adopts an existing `bank+name` row **only when it has no `pluggyAccountId`**; otherwise it disambiguates with the COMPE code from `bankData.transferNumber` (see `compeFromTransferNumber`). Adopting unconditionally made one Kevin account flip between two Pluggy accounts on every sync.

v1 `GET /transactions` returns HTTP 410 for applications created after 2026-06-02, so the client uses `/v2/transactions` cursor pagination exclusively.

### MCP server (`mcp/`)

A **read-only** MCP server over the ledger, spoken on stdio, so any agent conversation can
query the data. It lives inside `apps/api` rather than its own workspace because it boots the
Nest *application context* (`NestFactory.createApplicationContext`) and resolves the same
providers the HTTP API uses — one implementation of the balance and P/L rules, not two. A
separate package would have to import `AppModule`, making `apps/api` a library of itself.

Run with `pnpm mcp` (needs `pnpm build` first). `.mcp.json` at the repo root registers it for
Claude Code; `claude mcp add` installs it user-wide.

Ten tools: `get_financial_overview`, `list_accounts`, `aggregate_transactions`,
`search_transactions`, `get_portfolio_analysis`, `list_investments`, `get_cash_flow`,
`get_net_worth_history`, `get_benchmarks`, `get_data_quality`.

Three rules shape the design:

- **The server does the arithmetic, never the agent.** `aggregate_transactions` takes a metric
  and a grouping and returns computed buckets, so a model is never handed rows to add up. A
  wrong digit in a money figure does not read as an error, so it has to be impossible.
- **Nothing may write to stdout except JSON-RPC.** A stray log line corrupts the stream and the
  client drops the connection — hence `logger: false` and `console.error` for diagnostics.
- **The environment is loaded relative to `__dirname`, not the cwd.** Clients spawn the server
  from wherever the conversation is, so `apps/api/.env` is resolved from the compiled file's
  own location.

`BenchmarksService` (`market/`) fetches Selic/CDI/IPCA from the Banco Central SGS API, cached
6h. Series codes were verified against live responses: **1178** Selic a.a., **4389** CDI a.a.,
**433** IPCA monthly. Series 11 is the *daily* Selic — using it as an annual figure understates
the benchmark by two orders of magnitude, so it is deliberately absent.

### Web (React)

`main.tsx` wires QueryClientProvider + MUI ThemeProvider + BrowserRouter. `App.tsx` defines routes under a single `Layout`: `/dashboard`, `/transactions`, `/accounts`, `/assets`, `/categories`, `/rules`, `/imports`, `/settings`. There is deliberately no real-estate route — `AssetType` tracks investments only, and `Asset` means a market position. All API calls go through `src/api/client.ts` (axios, baseURL from `VITE_API_URL`). Data fetching uses `@tanstack/react-query`. UI is in Portuguese (pt-BR) — match existing copy when adding strings.

### Endpoints

Standard REST CRUD for each resource module. Notable non-CRUD:
- `POST /imports/csv` — multipart, field `file`, body `accountId` (+ optional `initialBalance`, `endBalance`). Returns `{ imported, duplicated, needsReview, historical }`.
- `POST /imports/csv/bulk` — multipart, field `files` (up to 50), body `accountId` (+ optional `initialBalance`/`endBalance` **only** when a single file is uploaded). Returns `{ results: [...] }` per file.
- `GET /dashboard/summary?month=YYYY-MM` — aggregates by category + account, computes `netWorth = totalAccountsBalance + totalAssetsValue`. Also returns the Overview shape: `totalBankBalance` / `totalCreditCardDebt` (cash and liabilities reported apart, never netted), `banks[]` grouped per institution with `sharePct`, `creditCards[]` with limit/available/`usedPct`/`dueDate`, and `investmentClasses[]` (Renda Fixa / Ações / Outros, see `common/asset-class.ts`).
- `GET /transactions` supports filters: account, category, month (competenceMonth), direction.
- `POST /open-finance/sync` — body `{ days?, itemIds? }`. Pulls Pluggy data into the ledger. Returns per-account `{ imported, duplicated, needsReview, pending, balance }`.
- `GET /open-finance/status` — `{ configured, connectionCount, itemCount }`. Never echoes credentials.
- `GET /open-finance/connections` — registered bank connections.
- `POST /open-finance/connect-token` — `{ accessToken }` for the Connect widget.
- `POST /open-finance/connections` — body `{ itemId }`. Persists what the widget returned.
- `POST /open-finance/connections/:id/reconnect-token` — widget token in update mode.
- `POST /open-finance/connections/:id/refresh` — re-reads the item status from Pluggy.
- `DELETE /open-finance/connections/:id` — forgets the connection; imported data is kept.

## Conventions

Follow these when adding features. They keep the codebase easy to navigate for humans and AI agents alike.

### Shared package is contract-first

Any new persisted field or enum:
1. Add to `packages/shared/src/index.ts` first (`enum` or `interface XxxDto`).
2. Rebuild shared: `pnpm --filter @ledger/shared build`.
3. Mirror the enum in `apps/api/prisma/schema.prisma` if it's a Prisma enum, then `pnpm db:migrate --name descriptive_name`.
4. Update backend service to include the field. **Never** import Prisma-generated enums in service code that also touches shared DTOs — the two types are nominally distinct. If you must cross the boundary, accept `string` and compare against `CategoryKind`/`Direction` values from `@ledger/shared`.

### Backend resource module template

Each resource has this exact shape under `apps/api/src/<resource>/`:

```
<resource>/
  <resource>.module.ts       // NestJS @Module wiring controller + service
  <resource>.controller.ts   // HTTP layer, uses UpdateXxxDto = PartialType(CreateXxxDto)
  <resource>.service.ts      // findAll / findOne / create / update / remove
  dto/
    create-xxx.dto.ts        // class-validator decorators (@IsUUID, @IsEnum, etc.)
    update-xxx.dto.ts        // extends PartialType(CreateXxxDto)
    query-xxx.dto.ts         // optional filter DTO for list endpoints
```

Global `ValidationPipe` is active — all body/query DTOs are auto-validated. Add `@IsOptional()` on optional fields.

### Frontend: API modules + query keys

Every backend resource has a matching `apps/web/src/api/<resource>.ts` exporting a plain object with `list/create/update/remove` (+ resource-specific extras). Pages **must** import from `../api` (barrel export), never from `../api/client` directly.

```ts
// apps/web/src/api/foos.ts
import type { FooDto } from '@ledger/shared';
import { apiClient } from './client';

export const foosApi = {
  list: async (): Promise<FooDto[]> => (await apiClient.get('/foos')).data,
  create: async (input: FooInput) => (await apiClient.post('/foos', input)).data,
  // ...
};
```

Register the query key in `apps/web/src/api/queryKeys.ts`:

```ts
export const qk = {
  // ...existing
  foos: { all: () => ['foos'] as const },
};
```

Then in the page:

```ts
const { data } = useQuery({ queryKey: qk.foos.all(), queryFn: foosApi.list });
```

### Frontend: hooks catalogue (use these, don't reinvent)

- `useInvalidate()` — named cache-invalidation scopes. Every mutation must invalidate `transactions()`, `dashboard()`, etc., not hand-write `queryClient.invalidateQueries`.
- `useConfirm()` — `await confirm({ title, message, destructive })` → `Promise<boolean>`. Never call `window.confirm()`; it breaks dark mode and can't be tested.
- `usePeriodState(bounds)` — folds year/month/periodType state + defaults + `.includes(competenceMonth)` filter. Bounds are `{ months?, earliestMonth?, latestMonth? }`. Does not fit Dashboard (whose bounds come from the API response); prefer inline state there.
- `usePagination(defaultRowsPerPage)` — `{ page, rowsPerPage, paginate, handleChangePage, handleChangeRowsPerPage }`.

### Frontend: shared components

- `<KpiCard label value />` — stat tile. Used on Dashboard + Assets.
- `<MoneyCell value colorSigned bold />` — formatted BRL amount with optional sign coloring.
- `<EmptyState title description icon action />` — empty-state layout.
- `<ErrorBoundary>` — mounted at root in `main.tsx`; children can throw safely.

### Errors and money

- Frontend mutations must set `onError: (err: unknown) => setFormError(readApiError(err, 'fallback pt-BR'))`. Never type errors as `any`. `readApiError` extracts message from AxiosError, plain Error, or falls back.
- Every currency string on screen must go through `formatBRL(value)` from `src/utils/format.ts`. Never `'R$ ${value}'`.

### Colors and theming

Never hardcode hex colors in a `sx` prop. Use `theme.palette` semantic keys:

| Instead of… | Use… |
| --- | --- |
| `color: '#7A868E'` (grey text) | `color: 'text.secondary'` |
| `color: '#0E9D63'` (green) | `color: 'success.main'` |
| `color: '#C7443F'` (red) | `color: 'error.main'` |
| `backgroundColor: '#F1F3F5'` (rail) | `backgroundColor: 'action.hover'` |
| `backgroundColor: '#16202A'` (dark accent) | `backgroundColor: 'primary.main'` |
| `borderBottom: '1px solid #F1F3F5'` | `borderBottom: 1, borderColor: 'divider'` |

**Exception**: MUI x-charts (`BarChart`, `LineChart`) doesn't resolve palette keys — pull real hex via `const { palette } = useTheme();` and pass `palette.success.main`.

Decorative pastel chip maps (asset/account-type badges in `assetDisplay.tsx` + `Accounts.tsx`) are intentional brand color choices, not theme greys — leave them.

### Copy is pt-BR

All UI strings, empty states, alerts, error messages, tooltips: Portuguese. Match casing/tone of existing copy (`Nova transação`, `Sem categoria`, `Excluir`, etc.).

### File-splitting heuristic

Pages > 500 LOC get split into sibling component files under the same folder (or a subfolder for tightly-coupled ones). Rule of thumb: dialog/form + table/list + filters + toolbar all deserve their own file once the page has all four.

### Testing conventions

- Colocate `*.test.ts` next to source.
- Unit-test pure functions first (`impactOf`, `normalizeDescription`, `formatBRL`).
- Integration tests for services that touch Prisma should stub `PrismaService`.
- React component tests need `@testing-library/react` (not installed yet).

### Not established yet (safe to introduce)

- Uniform backend error shape (`ApiErrorDto`) — currently NestJS defaults leak through.
- Per-page conventions differ between older pages (Accounts, Rules, Investments — still use inline `apiClient` + native `confirm()`) and migrated ones (Transactions, Categories, Dashboard, Imports, Settings). New work should follow the migrated shape; sweep old pages when touched.
