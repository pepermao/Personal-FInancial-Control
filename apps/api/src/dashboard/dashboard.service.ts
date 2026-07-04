import { Injectable } from '@nestjs/common';
import { AssetType, Direction } from '@ledger/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AssetsService } from '../assets/assets.service';
import { impactOf } from '../common/category-kind';

function endOfMonth(yyyyMm: string): Date {
  const [y, m] = yyyyMm.split('-').map(Number);
  // Day 0 of next month = last day of this month. UTC to avoid TZ drift.
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}

function endOfYear(yyyy: string): Date {
  return new Date(Date.UTC(Number(yyyy), 11, 31, 23, 59, 59, 999));
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly assetsService: AssetsService,
  ) {}

  async summary(month?: string, year?: string) {
    const bounds = await this.prisma.transaction.aggregate({
      _min: { competenceMonth: true },
      _max: { competenceMonth: true },
    });
    const earliestMonth = bounds._min.competenceMonth ?? null;
    const latestMonth = bounds._max.competenceMonth ?? null;

    let periodType: 'month' | 'year';
    let responseMonth: string | null;
    let responseYear: string;
    let competenceMonthFilter: { equals: string } | { startsWith: string };

    if (month) {
      periodType = 'month';
      responseMonth = month;
      responseYear = month.slice(0, 4);
      competenceMonthFilter = { equals: month };
    } else {
      periodType = 'year';
      responseMonth = null;
      responseYear = year ?? latestMonth?.slice(0, 4) ?? new Date().getFullYear().toString();
      competenceMonthFilter = { startsWith: `${responseYear}-` };
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { competenceMonth: competenceMonthFilter },
      include: { category: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategoryMap = new Map<string, { categoryId: string | null; categoryName: string; total: number }>();

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const impact = impactOf(tx.category?.kind, tx.direction);

      if (impact.addsToIncome && tx.impactsDashboardIncome) totalIncome += amount;
      if (impact.addsToExpense && tx.impactsDashboardExpense) totalExpense += amount;
      if (impact.subtractsFromExpense && tx.impactsDashboardExpense) totalExpense -= amount;

      if (impact.addsToExpense && tx.impactsDashboardExpense) {
        const key = tx.categoryId ?? 'uncategorized';
        const categoryName = tx.category?.name ?? 'Sem categoria';
        const entry = byCategoryMap.get(key) ?? {
          categoryId: tx.categoryId,
          categoryName,
          total: 0,
        };
        entry.total += amount;
        byCategoryMap.set(key, entry);
      }
    }
    if (totalExpense < 0) totalExpense = 0;

    const cutoff = periodType === 'month'
      ? endOfMonth(responseMonth!)
      : endOfYear(responseYear);

    // Accounts are scoped by tx date up to period end. Assets stay as latest known snapshot
    // (personal finance apps treat them as a current position, not a per-period timeline).
    const [accounts, assets] = await Promise.all([
      this.accountsService.findAll(cutoff),
      this.assetsService.findAll(),
    ]);

    const byAccount = accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      bankName: account.bank.name,
      balance: account.currentBalance,
    }));
    const totalAccountsBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
    const totalInvestments = assets
      .filter((a) => a.type !== AssetType.REAL_ESTATE)
      .reduce((sum, a) => sum + Number(a.value), 0);
    const totalRealEstate = assets
      .filter((a) => a.type === AssetType.REAL_ESTATE)
      .reduce((sum, a) => sum + Number(a.value), 0);
    const totalAssetsValue = totalInvestments + totalRealEstate;

    return {
      periodType,
      month: responseMonth,
      year: responseYear,
      earliestMonth,
      latestMonth,
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      balance: (totalIncome - totalExpense).toFixed(2),
      byCategory: Array.from(byCategoryMap.values())
        .sort((a, b) => b.total - a.total)
        .map((entry) => ({ ...entry, total: entry.total.toFixed(2) })),
      byAccount: byAccount.sort((a, b) => Number(b.balance) - Number(a.balance)),
      totalAccountsBalance: totalAccountsBalance.toFixed(2),
      totalInvestments: totalInvestments.toFixed(2),
      totalRealEstate: totalRealEstate.toFixed(2),
      totalAssetsValue: totalAssetsValue.toFixed(2),
      netWorth: (totalAccountsBalance + totalAssetsValue).toFixed(2),
    };
  }

  /** Monthly buckets (Jan-Dec) for a year, or daily buckets (1-31) for a specific month. */
  async cashFlow(month?: string, year?: string) {
    if (month) {
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const transactions = await this.prisma.transaction.findMany({ where: { competenceMonth: month } });

      const buckets = new Map<number, { income: number; expense: number }>();
      for (let day = 1; day <= daysInMonth; day++) buckets.set(day, { income: 0, expense: 0 });

      for (const tx of transactions) {
        const entry = buckets.get(new Date(tx.date).getUTCDate());
        if (!entry) continue;
        const amount = Number(tx.amount);
        if (tx.direction === Direction.INCOME && tx.impactsDashboardIncome) entry.income += amount;
        if (tx.direction === Direction.EXPENSE && tx.impactsDashboardExpense) entry.expense += amount;
      }

      return {
        granularity: 'day' as const,
        series: Array.from(buckets.entries()).map(([day, v]) => ({
          label: String(day).padStart(2, '0'),
          income: v.income.toFixed(2),
          expense: v.expense.toFixed(2),
        })),
      };
    }

    const bounds = await this.prisma.transaction.aggregate({ _max: { competenceMonth: true } });
    const responseYear = year ?? bounds._max.competenceMonth?.slice(0, 4) ?? new Date().getFullYear().toString();
    const transactions = await this.prisma.transaction.findMany({
      where: { competenceMonth: { startsWith: `${responseYear}-` } },
    });

    const buckets = new Map<string, { income: number; expense: number }>();
    for (let m = 1; m <= 12; m++) buckets.set(String(m).padStart(2, '0'), { income: 0, expense: 0 });

    for (const tx of transactions) {
      const entry = buckets.get(tx.competenceMonth.slice(5, 7));
      if (!entry) continue;
      const amount = Number(tx.amount);
      if (tx.direction === Direction.INCOME && tx.impactsDashboardIncome) entry.income += amount;
      if (tx.direction === Direction.EXPENSE && tx.impactsDashboardExpense) entry.expense += amount;
    }

    return {
      granularity: 'month' as const,
      series: Array.from(buckets.entries()).map(([monthKey, v]) => ({
        label: monthKey,
        income: v.income.toFixed(2),
        expense: v.expense.toFixed(2),
      })),
    };
  }

  /** Net worth at the end of each of the trailing 12 months, ending at the current real-world month. */
  async netWorthHistory() {
    const [accounts, transactions, assets] = await Promise.all([
      this.prisma.account.findMany({ select: { initialBalance: true } }),
      this.prisma.transaction.findMany({
        where: { impactsAccountBalance: true },
        select: { date: true, amount: true, direction: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.asset.findMany({ select: { date: true, value: true } }),
    ]);

    const initialBalanceSum = accounts.reduce((sum, a) => sum + Number(a.initialBalance), 0);

    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    const series = months.map((month) => {
      const [y, m] = month.split('-').map(Number);
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      const txSum = transactions
        .filter((tx) => tx.date <= endOfMonth)
        .reduce(
          (sum, tx) => sum + (tx.direction === Direction.INCOME ? Number(tx.amount) : -Number(tx.amount)),
          0,
        );
      const assetsSum = assets
        .filter((asset) => asset.date <= endOfMonth)
        .reduce((sum, asset) => sum + Number(asset.value), 0);

      return {
        label: month,
        netWorth: (initialBalanceSum + txSum + assetsSum).toFixed(2),
      };
    });

    return { series };
  }
}
