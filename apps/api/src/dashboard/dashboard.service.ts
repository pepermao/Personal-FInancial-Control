import { Injectable } from '@nestjs/common';
import { AccountType } from '@kevin/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AssetsService } from '../assets/assets.service';
import { impactOf } from '../common/category-kind';
import { countsAsPnl } from '../common/pnl';
import { assetClassOf } from '../common/asset-class';

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
    let grossExpense = 0;
    let reimbursements = 0;
    const byCategoryMap = new Map<string, { categoryId: string | null; categoryName: string; total: number }>();

    for (const tx of transactions) {
      // Transfers between own accounts and investment applications/redemptions are not
      // income or expense — see `countsAsPnl`.
      if (!countsAsPnl(tx.nature, tx.category?.kind)) continue;

      const amount = Number(tx.amount);
      const impact = impactOf(tx.category?.kind, tx.direction);

      if (impact.addsToIncome && tx.impactsDashboardIncome) totalIncome += amount;
      if (impact.addsToExpense && tx.impactsDashboardExpense) grossExpense += amount;
      if (impact.subtractsFromExpense && tx.impactsDashboardExpense) reimbursements += amount;

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
    // Net expense can legitimately be negative (reimbursements > spending). Surface it faithfully.
    const totalExpense = grossExpense - reimbursements;

    const cutoff = periodType === 'month'
      ? endOfMonth(responseMonth!)
      : endOfYear(responseYear);

    const [accounts, explicitAssets] = await Promise.all([
      this.accountsService.findAll(cutoff),
      this.assetsService.findAll(cutoff),
    ]);

    const byAccount = accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      bankName: account.bank.name,
      balance: account.currentBalance,
    }));
    const totalAccountsBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

    // Cash and card debt are reported apart. Netting them hides both: a card is a liability,
    // not a smaller bank balance, and its limit is only legible next to what is owed.
    const cardAccounts = accounts.filter((a) => a.type === AccountType.CREDIT_CARD);
    const cashAccounts = accounts.filter((a) => a.type !== AccountType.CREDIT_CARD);

    const totalBankBalance = cashAccounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
    const totalCreditCardDebt = cardAccounts.reduce(
      (sum, a) => sum + Math.abs(Number(a.currentBalance)),
      0,
    );

    const bankMap = new Map<string, { bankId: string; bankName: string; balance: number; accountCount: number }>();
    for (const account of cashAccounts) {
      const entry = bankMap.get(account.bankId) ?? {
        bankId: account.bankId,
        bankName: account.bank.name,
        balance: 0,
        accountCount: 0,
      };
      entry.balance += Number(account.currentBalance);
      entry.accountCount += 1;
      bankMap.set(account.bankId, entry);
    }
    const banks = Array.from(bankMap.values())
      .sort((a, b) => b.balance - a.balance)
      .map((entry) => ({
        ...entry,
        balance: entry.balance.toFixed(2),
        sharePct: totalBankBalance ? Number(((entry.balance / totalBankBalance) * 100).toFixed(1)) : 0,
      }));

    const creditCards = cardAccounts
      .map((account) => {
        const used = Math.abs(Number(account.currentBalance));
        const limit = account.creditLimit === null ? null : Number(account.creditLimit);
        return {
          accountId: account.id,
          accountName: account.name,
          accountNumber: account.accountNumber,
          used: used.toFixed(2),
          limit: limit === null ? null : limit.toFixed(2),
          available:
            account.availableCreditLimit === null
              ? null
              : Number(account.availableCreditLimit).toFixed(2),
          usedPct: limit ? Number(((used / limit) * 100).toFixed(1)) : null,
          dueDate: account.creditDueDate ? account.creditDueDate.toISOString() : null,
        };
      })
      .sort((a, b) => Number(b.used) - Number(a.used));
    // Investment positions come only from recorded Assets, never inferred from transactions.
    //
    // Inferring them made sense when statements were the only source and positions were
    // unknown. Open Finance reports real positions, so inferring on top counts the same
    // money twice: once as the transfer into the position, once as the position itself.
    const totalInvestments = explicitAssets.reduce((sum, a) => sum + Number(a.value), 0);

    const classMap = new Map<string, { className: string; value: number; count: number }>();
    for (const asset of explicitAssets) {
      const className = assetClassOf(asset.type);
      const entry = classMap.get(className) ?? { className, value: 0, count: 0 };
      entry.value += Number(asset.value);
      entry.count += 1;
      classMap.set(className, entry);
    }
    const investmentClasses = Array.from(classMap.values())
      .sort((a, b) => b.value - a.value)
      .map((entry) => ({
        ...entry,
        value: entry.value.toFixed(2),
        sharePct: totalInvestments ? Number(((entry.value / totalInvestments) * 100).toFixed(1)) : 0,
      }));

    return {
      periodType,
      month: responseMonth,
      year: responseYear,
      earliestMonth,
      latestMonth,
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      grossExpense: grossExpense.toFixed(2),
      reimbursements: reimbursements.toFixed(2),
      balance: (totalIncome - totalExpense).toFixed(2),
      byCategory: Array.from(byCategoryMap.values())
        .sort((a, b) => b.total - a.total)
        .map((entry) => ({ ...entry, total: entry.total.toFixed(2) })),
      byAccount: byAccount.sort((a, b) => Number(b.balance) - Number(a.balance)),
      totalAccountsBalance: totalAccountsBalance.toFixed(2),
      totalBankBalance: totalBankBalance.toFixed(2),
      totalCreditCardDebt: totalCreditCardDebt.toFixed(2),
      banks,
      creditCards,
      investmentClasses,
      totalInvestments: totalInvestments.toFixed(2),
      netWorth: (totalAccountsBalance + totalInvestments).toFixed(2),
    };
  }

    /** Monthly buckets (Jan-Dec) for a year, or daily buckets (1-31) for a specific month. Kind-aware. */
  async cashFlow(month?: string, year?: string) {
    const applyImpact = (
      entry: { income: number; expense: number },
      tx: {
        amount: unknown;
        direction: string;
        nature: string;
        impactsDashboardIncome: boolean;
        impactsDashboardExpense: boolean;
        category: { kind: string } | null;
      },
    ) => {
      if (!countsAsPnl(tx.nature, tx.category?.kind)) return;
      const amount = Number(tx.amount);
      const impact = impactOf(tx.category?.kind, tx.direction);
      if (impact.addsToIncome && tx.impactsDashboardIncome) entry.income += amount;
      if (impact.addsToExpense && tx.impactsDashboardExpense) entry.expense += amount;
      if (impact.subtractsFromExpense && tx.impactsDashboardExpense) entry.expense -= amount;
    };

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const transactions = await this.prisma.transaction.findMany({
        where: { competenceMonth: month },
        select: {
          amount: true,
          direction: true,
          nature: true,
          date: true,
          impactsDashboardIncome: true,
          impactsDashboardExpense: true,
          category: { select: { kind: true } },
        },
      });

      const buckets = new Map<number, { income: number; expense: number }>();
      for (let day = 1; day <= daysInMonth; day++) buckets.set(day, { income: 0, expense: 0 });

      for (const tx of transactions) {
        const entry = buckets.get(new Date(tx.date).getUTCDate());
        if (!entry) continue;
        applyImpact(entry, tx);
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
      select: {
        amount: true,
        direction: true,
        nature: true,
        competenceMonth: true,
        impactsDashboardIncome: true,
        impactsDashboardExpense: true,
        category: { select: { kind: true } },
      },
    });

    const buckets = new Map<string, { income: number; expense: number }>();
    for (let m = 1; m <= 12; m++) buckets.set(String(m).padStart(2, '0'), { income: 0, expense: 0 });

    for (const tx of transactions) {
      const entry = buckets.get(tx.competenceMonth.slice(5, 7));
      if (!entry) continue;
      applyImpact(entry, tx);
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
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    const series = await Promise.all(
      months.map(async (month) => {
        const [y, m] = month.split('-').map(Number);
        const cutoff = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        const [accounts, assets] = await Promise.all([
          this.accountsService.findAll(cutoff),
          this.assetsService.findAll(cutoff),
        ]);
        const accountsSum = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
        const assetsSum = assets.reduce((sum, a) => sum + Number(a.value), 0);
        return {
          label: month,
          netWorth: (accountsSum + assetsSum).toFixed(2),
        };
      }),
    );

    return { series };
  }
}
