import { Injectable } from '@nestjs/common';
import { AssetType, Direction } from '@ledger/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AssetsService } from '../assets/assets.service';

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
      if (tx.direction === Direction.INCOME && tx.impactsDashboardIncome) {
        totalIncome += amount;
      }
      if (tx.direction === Direction.EXPENSE && tx.impactsDashboardExpense) {
        totalExpense += amount;

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

    const [accounts, assets] = await Promise.all([
      this.accountsService.findAll(),
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
}
