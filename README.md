# Ledger

A personal finance application: track accounts, transactions, categories, auto-classification rules,
wealth assets, and CSV bank statement imports.

## Stack

- **Frontend**: React + Vite + TypeScript + MUI + React Query
- **Backend**: NestJS + TypeScript + Prisma
- **Database**: PostgreSQL (via Docker Compose)
- **Monorepo**: pnpm workspaces

## Project structure

```
apps/
  web/      # React frontend
  api/      # NestJS backend
packages/
  shared/   # Shared TypeScript types/enums
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL
docker compose up -d

# 4. Run migrations
pnpm db:migrate

# 5. Seed initial data (banks, accounts, categories, classification rules)
pnpm db:seed

# 6. Start both apps in dev mode
pnpm dev
```

The API runs on `http://localhost:3001`, the web app on `http://localhost:5173`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start API and web app in dev mode |
| `pnpm build` | Build both apps for production |
| `pnpm lint` | Lint both apps |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## Core domain

- **Banks** have many **Accounts**.
- **Accounts** have many **Transactions**.
- **Categories** are hierarchical (`parentId`), e.g. Moradia > Aluguel.
- **Classification rules** auto-categorize transactions by text matching against the description,
  ordered by priority.
- **Transactions** are the source of truth for all financial activity.
- **Assets** represent current wealth positions (cash, RDB, investments, real estate).
- **Import batches** track CSV imports, including how many rows were imported, skipped as
  duplicates, or flagged for manual review.

## CSV import

`POST /imports/csv` (multipart form, field `file`) parses a CSV, normalizes each row, computes a
fingerprint (`accountId + date + amount + normalized description`) to avoid duplicate inserts,
applies classification rules in priority order, and returns:

```json
{ "imported": 42, "duplicated": 3, "needsReview": 5 }
```

## API overview

| Module | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Banks | `GET/POST/PATCH/DELETE /banks` |
| Accounts | `GET/POST/PATCH/DELETE /accounts` |
| Categories | `GET/POST/PATCH/DELETE /categories` |
| Classification rules | `GET/POST/PATCH/DELETE /classification-rules` |
| Transactions | `GET/POST/PATCH/DELETE /transactions` (filterable by account, category, month, direction) |
| Assets | `GET/POST/PATCH/DELETE /assets` |
| Imports | `POST /imports/csv` |
| Dashboard | `GET /dashboard/summary?month=YYYY-MM` |

## Frontend routes

`/dashboard`, `/transactions`, `/accounts`, `/assets`, `/categories`, `/rules`, `/imports`, `/settings`.
