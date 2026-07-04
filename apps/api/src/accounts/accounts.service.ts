import { Injectable, NotFoundException } from '@nestjs/common';
import { Direction } from '@ledger/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const accounts = await this.prisma.account.findMany({
      include: { bank: true },
      orderBy: { name: 'asc' },
    });
    const balances = await this.sumTransactionsByAccount(accounts.map((a) => a.id));
    return accounts.map((account) => this.withCurrentBalance(account, balances));
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: { bank: true },
    });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    const balances = await this.sumTransactionsByAccount([id]);
    return this.withCurrentBalance(account, balances);
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.account.delete({ where: { id } });
  }

  /** Sums income/expense transaction amounts per account in one query. */
  private async sumTransactionsByAccount(accountIds: string[]) {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['accountId', 'direction'],
      where: { accountId: { in: accountIds }, impactsAccountBalance: true },
      _sum: { amount: true },
    });

    const balances = new Map<string, { income: number; expense: number }>();
    for (const row of grouped) {
      const entry = balances.get(row.accountId) ?? { income: 0, expense: 0 };
      const sum = Number(row._sum.amount ?? 0);
      if (row.direction === Direction.INCOME) entry.income += sum;
      else entry.expense += sum;
      balances.set(row.accountId, entry);
    }
    return balances;
  }

  private withCurrentBalance<T extends { id: string; initialBalance: unknown }>(
    account: T,
    balances: Map<string, { income: number; expense: number }>,
  ) {
    const { income, expense } = balances.get(account.id) ?? { income: 0, expense: 0 };
    const currentBalance = Number(account.initialBalance) + income - expense;
    return { ...account, currentBalance: currentBalance.toFixed(2) };
  }
}
