import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Direction } from '@kevin/shared';
import type { PrismaService } from '../prisma/prisma.service';
import type { DashboardService } from '../dashboard/dashboard.service';
import type { AccountsService } from '../accounts/accounts.service';
import type { BenchmarksService } from '../market/benchmarks.service';
import type { PluggyConnectionsService } from '../open-finance/pluggy-connections.service';
import { countsAsPnl } from '../common/pnl';
import { assetClassOf } from '../common/asset-class';
import { issuerExposure, upcomingMaturities } from '../common/portfolio';
import { normalizeDescription } from '../common/normalize';

export interface ToolDeps {
  prisma: PrismaService;
  dashboard: DashboardService;
  accounts: AccountsService;
  benchmarks: BenchmarksService;
  connections: PluggyConnectionsService;
}

/** Rows returned to an agent are capped — a full ledger would blow the context window. */
const MAX_ROWS = 200;

function json(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

export function registerTools(server: McpServer, deps: ToolDeps): void {
  const { prisma, dashboard, accounts, benchmarks, connections } = deps;

  server.registerTool(
    'get_financial_overview',
    {
      title: 'Financial overview',
      description:
        'Current position: net worth, cash by bank, credit-card debt and limits, and investments by class. ' +
        'Start here for "how am I doing" questions — every figure is computed server-side.',
      inputSchema: {
        period: z
          .string()
          .optional()
          .describe('YYYY for a year or YYYY-MM for a month. Defaults to the latest data.'),
      },
    },
    async ({ period }) => {
      const isMonth = Boolean(period && period.length === 7);
      const summary = await dashboard.summary(
        isMonth ? period : undefined,
        !isMonth ? period : undefined,
      );
      return json({
        period: { type: summary.periodType, month: summary.month, year: summary.year },
        netWorth: money(summary.netWorth),
        cash: {
          total: money(summary.totalBankBalance),
          byBank: summary.banks,
        },
        creditCards: {
          totalOwed: money(summary.totalCreditCardDebt),
          cards: summary.creditCards,
        },
        investments: {
          total: money(summary.totalInvestments),
          byClass: summary.investmentClasses,
        },
        periodFlows: {
          income: money(summary.totalIncome),
          expense: money(summary.totalExpense),
          net: money(summary.balance),
          note:
            'Internal transfers and investment applications/redemptions are excluded — they are not income or expense.',
        },
      });
    },
  );

  server.registerTool(
    'list_accounts',
    {
      title: 'List accounts',
      description: 'Every account with its current balance, type and institution. Credit-card balances are negative.',
      inputSchema: {},
    },
    async () => {
      const rows = await accounts.findAll();
      return json(
        rows.map((account) => ({
          id: account.id,
          name: account.name,
          bank: account.bank.name,
          type: account.type,
          balance: money(account.currentBalance),
          creditLimit: account.creditLimit === null ? null : money(account.creditLimit),
          availableCredit:
            account.availableCreditLimit === null ? null : money(account.availableCreditLimit),
        })),
      );
    },
  );

  server.registerTool(
    'aggregate_transactions',
    {
      title: 'Aggregate transactions',
      description:
        'Group transactions and compute a metric, without writing SQL and without the caller doing arithmetic. ' +
        'Use this for "how much did I spend on X", "what do I spend per month", "biggest categories". ' +
        'Transfers between own accounts and investment flows are excluded by default.',
      inputSchema: {
        metric: z.enum(['sum', 'count', 'avg']).default('sum'),
        groupBy: z.enum(['category', 'month', 'account', 'direction', 'type']).default('category'),
        direction: z.enum(['INCOME', 'EXPENSE']).optional().describe('Restrict to money in or out'),
        from: z.string().optional().describe('Inclusive start date, YYYY-MM-DD'),
        to: z.string().optional().describe('Inclusive end date, YYYY-MM-DD'),
        descriptionContains: z
          .string()
          .optional()
          .describe('Case- and accent-insensitive substring of the description, e.g. "uber"'),
        includeTransfers: z
          .boolean()
          .default(false)
          .describe('Include internal transfers and investment flows. Normally false.'),
        limit: z.number().int().min(1).max(50).default(25),
      },
    },
    async ({ metric, groupBy, direction, from, to, descriptionContains, includeTransfers, limit }) => {
      const transactions = await prisma.transaction.findMany({
        where: {
          ...(direction ? { direction } : {}),
          ...(from || to
            ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
            : {}),
        },
        select: {
          amount: true,
          date: true,
          direction: true,
          nature: true,
          type: true,
          competenceMonth: true,
          descriptionNormalized: true,
          category: { select: { name: true, kind: true } },
          account: { select: { name: true } },
        },
      });

      const needle = descriptionContains ? normalizeDescription(descriptionContains) : null;
      const buckets = new Map<string, { total: number; count: number }>();

      for (const tx of transactions) {
        if (!includeTransfers && !countsAsPnl(tx.nature, tx.category?.kind)) continue;
        if (needle && !tx.descriptionNormalized.includes(needle)) continue;

        const key =
          groupBy === 'category'
            ? (tx.category?.name ?? 'Sem categoria')
            : groupBy === 'month'
              ? tx.competenceMonth
              : groupBy === 'account'
                ? tx.account.name
                : groupBy === 'direction'
                  ? tx.direction
                  : tx.type;

        const entry = buckets.get(key) ?? { total: 0, count: 0 };
        entry.total += Number(tx.amount);
        entry.count += 1;
        buckets.set(key, entry);
      }

      const rows = Array.from(buckets.entries())
        .map(([bucket, entry]) => ({
          bucket,
          value:
            metric === 'count'
              ? entry.count
              : metric === 'avg'
                ? Number((entry.total / entry.count).toFixed(2))
                : Number(entry.total.toFixed(2)),
          count: entry.count,
        }))
        .sort((a, b) => (groupBy === 'month' ? a.bucket.localeCompare(b.bucket) : b.value - a.value))
        .slice(0, limit);

      return json({ metric, groupBy, rows, matched: transactions.length });
    },
  );

  server.registerTool(
    'search_transactions',
    {
      title: 'Search transactions',
      description:
        'Individual transactions matching a filter, newest first. Use when the user asks about specific ' +
        'purchases. For totals use aggregate_transactions instead — never add these up yourself.',
      inputSchema: {
        descriptionContains: z.string().optional(),
        direction: z.enum(['INCOME', 'EXPENSE']).optional(),
        from: z.string().optional().describe('Inclusive start date, YYYY-MM-DD'),
        to: z.string().optional().describe('Inclusive end date, YYYY-MM-DD'),
        uncategorizedOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(MAX_ROWS).default(50),
      },
    },
    async ({ descriptionContains, direction, from, to, uncategorizedOnly, limit }) => {
      const rows = await prisma.transaction.findMany({
        where: {
          ...(direction ? { direction } : {}),
          ...(uncategorizedOnly ? { categoryId: null } : {}),
          ...(descriptionContains
            ? { descriptionNormalized: { contains: normalizeDescription(descriptionContains) } }
            : {}),
          ...(from || to
            ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
            : {}),
        },
        orderBy: { date: 'desc' },
        take: Math.min(limit, MAX_ROWS),
        select: {
          id: true,
          date: true,
          descriptionRaw: true,
          amount: true,
          direction: true,
          type: true,
          nature: true,
          category: { select: { name: true } },
          account: { select: { name: true } },
        },
      });

      return json(
        rows.map((tx) => ({
          id: tx.id,
          date: tx.date.toISOString().slice(0, 10),
          description: tx.descriptionRaw,
          amount: money(tx.amount),
          direction: tx.direction,
          type: tx.type,
          category: tx.category?.name ?? null,
          account: tx.account.name,
        })),
      );
    },
  );

  server.registerTool(
    'get_portfolio_analysis',
    {
      title: 'Portfolio analysis',
      description:
        'Investment positions broken down by class and issuer, with FGC coverage (R$250k per issuer) and ' +
        'upcoming maturities. Use for allocation, concentration and deposit-guarantee questions.',
      inputSchema: {
        maturityHorizonDays: z.number().int().min(1).max(3650).default(365),
      },
    },
    async ({ maturityHorizonDays }) => {
      const assets = await prisma.asset.findMany();
      const total = assets.reduce((sum, asset) => sum + Number(asset.value), 0);

      const byClass = new Map<string, { value: number; count: number }>();
      for (const asset of assets) {
        const className = assetClassOf(asset.type);
        const entry = byClass.get(className) ?? { value: 0, count: 0 };
        entry.value += Number(asset.value);
        entry.count += 1;
        byClass.set(className, entry);
      }

      return json({
        total: money(total),
        byClass: Array.from(byClass.entries())
          .map(([className, entry]) => ({
            className,
            value: money(entry.value),
            count: entry.count,
            sharePct: total ? Number(((entry.value / total) * 100).toFixed(2)) : 0,
          }))
          .sort((a, b) => b.value - a.value),
        byIssuer: issuerExposure(assets),
        maturities: upcomingMaturities(assets, new Date(), maturityHorizonDays),
        notes: [
          'FGC covers CDB, LCI, LCA and poupança up to R$250.000 per issuer per CPF. Treasury bonds, stocks and FIIs are not covered.',
          'Issuers recorded as "Desconhecido" make concentration and FGC figures understate real exposure.',
        ],
      });
    },
  );

  server.registerTool(
    'list_investments',
    {
      title: 'List investments',
      description: 'Every recorded investment position with type, issuer, rate and maturity.',
      inputSchema: {},
    },
    async () => {
      const assets = await prisma.asset.findMany({ orderBy: { value: 'desc' } });
      return json(
        assets.map((asset) => ({
          name: asset.name,
          type: asset.type,
          assetClass: assetClassOf(asset.type),
          value: money(asset.value),
          issuer: asset.issuer,
          rate: asset.profitRate === null ? null : Number(asset.profitRate),
          rateType: asset.profitRateType,
          dueDate: asset.dueDate ? asset.dueDate.toISOString().slice(0, 10) : null,
        })),
      );
    },
  );

  server.registerTool(
    'get_cash_flow',
    {
      title: 'Cash flow',
      description:
        'Income, expense and net per month, plus the savings rate. Use for budgeting and trend questions.',
      inputSchema: { year: z.string().optional().describe('YYYY. Defaults to the latest year with data.') },
    },
    async ({ year }) => {
      const flow = await dashboard.cashFlow(undefined, year);
      const months = flow.series.map((point) => {
        const income = Number(point.income);
        const expense = Number(point.expense);
        return {
          month: point.label,
          income: money(income),
          expense: money(expense),
          net: money(income - expense),
          savingsRatePct: income ? Number((((income - expense) / income) * 100).toFixed(1)) : null,
        };
      });

      const withIncome = months.filter((m) => m.income > 0);
      const withExpense = months.filter((m) => m.expense > 0);
      const avg = (rows: number[]) =>
        rows.length ? Number((rows.reduce((a, b) => a + b, 0) / rows.length).toFixed(2)) : 0;

      return json({
        months,
        averages: {
          monthlyIncome: avg(withIncome.map((m) => m.income)),
          monthlyExpense: avg(withExpense.map((m) => m.expense)),
        },
      });
    },
  );

  server.registerTool(
    'get_net_worth_history',
    {
      title: 'Net worth history',
      description: 'Net worth at the end of each of the last 12 months.',
      inputSchema: {},
    },
    async () => {
      const history = await dashboard.netWorthHistory();
      return json(
        history.series.map((point) => ({ month: point.label, netWorth: money(point.netWorth) })),
      );
    },
  );

  server.registerTool(
    'get_benchmarks',
    {
      title: 'Benchmark rates',
      description:
        'Current Selic, CDI and 12-month IPCA from the Banco Central, plus the real (inflation-adjusted) rate. ' +
        'Always call this before comparing a return against the market — never state a rate from memory.',
      inputSchema: {},
    },
    async () => json(await benchmarks.get()),
  );

  server.registerTool(
    'get_data_quality',
    {
      title: 'Data quality and freshness',
      description:
        'How current and how complete the data is: bank connections, last sync, and how much is uncategorised. ' +
        'Check this before drawing conclusions — a large uncategorised share distorts spending figures.',
      inputSchema: {},
    },
    async () => {
      const [registered, total, uncategorized, oldest, newest] = await Promise.all([
        connections.findAll(),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { categoryId: null } }),
        prisma.transaction.aggregate({ _min: { date: true } }),
        prisma.transaction.aggregate({ _max: { date: true } }),
      ]);

      const uncategorizedValue = await prisma.transaction.aggregate({
        where: { categoryId: null },
        _sum: { amount: true },
      });

      return json({
        connections: registered.map((connection) => ({
          institution: connection.connectorName,
          status: connection.status,
          lastSyncAt: connection.lastSyncAt,
        })),
        transactions: {
          total,
          uncategorized,
          uncategorizedPct: total ? Number(((uncategorized / total) * 100).toFixed(1)) : 0,
          uncategorizedValue: money(uncategorizedValue._sum.amount ?? 0),
          earliest: oldest._min.date?.toISOString().slice(0, 10) ?? null,
          latest: newest._max.date?.toISOString().slice(0, 10) ?? null,
        },
        caveats: [
          'Open Finance exposes at most 12 months of history; anything older came from CSV imports.',
          'Pluggy refreshes once every 24 hours, so the latest day may be incomplete.',
        ],
      });
    },
  );
}
