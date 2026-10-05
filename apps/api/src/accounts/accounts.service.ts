import { Injectable, NotFoundException } from '@nestjs/common';
import { Direction, TransactionNature } from '@ledger/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { impactOf } from '../common/category-kind';

interface BalanceAnchor {
  /** Max transaction date of the import batch whose endBalance we're anchoring to (inclusive). */
  asOfDate: Date;
  /** Bank-truth balance as-of that date. */
  endBalance: number;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(cutoff?: Date) {
    const accounts = await this.prisma.account.findMany({
      include: { bank: true },
      orderBy: { name: 'asc' },
    });
    const accountIds = accounts.map((a) => a.id);
    const anchors = await this.latestAnchorsBefore(accountIds, cutoff);
    const deltas = await this.txDeltaSinceAnchor(accountIds, anchors, cutoff);
    return accounts.map((account) => this.withCurrentBalance(account, anchors, deltas));
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: { bank: true },
    });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    const anchors = await this.latestAnchorsBefore([id]);
    const deltas = await this.txDeltaSinceAnchor([id], anchors);
    return this.withCurrentBalance(account, anchors, deltas);
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

  /**
   * For each account, find the latest ImportBatch that has an endBalance and whose
   * newest transaction date is <= cutoff. That batch's endBalance becomes the
   * bank-truth anchor for the account at that date.
   */
  private async latestAnchorsBefore(
    accountIds: string[],
    cutoff?: Date,
  ): Promise<Map<string, BalanceAnchor>> {
    const batches = await this.prisma.importBatch.findMany({
      where: {
        accountId: { in: accountIds },
        endBalance: { not: null },
        historical: false,
      },
      select: {
        accountId: true,
        endBalance: true,
        createdAt: true,
        transactions: {
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    const anchors = new Map<string, BalanceAnchor>();
    for (const batch of batches) {
      // A batch with no transactions still carries bank truth: an Open Finance sync of an
      // account that had no movement in the window reports a real balance and zero rows.
      // Anchoring those at the batch's own timestamp keeps the balance; skipping them
      // silently reported the account as empty.
      const asOfDate = batch.transactions[0]?.date ?? batch.createdAt;
      if (cutoff && asOfDate > cutoff) continue;
      const existing = anchors.get(batch.accountId);
      if (!existing || asOfDate > existing.asOfDate) {
        anchors.set(batch.accountId, {
          asOfDate,
          endBalance: Number(batch.endBalance),
        });
      }
    }
    return anchors;
  }

  /**
   * Per-account signed sum of transactions strictly after the anchor date (if any) up to cutoff.
   * Accounts without an anchor get the full-history sum instead (fallback to initialBalance model).
   */
  private async txDeltaSinceAnchor(
    accountIds: string[],
    anchors: Map<string, BalanceAnchor>,
    cutoff?: Date,
  ): Promise<Map<string, number>> {
    if (accountIds.length === 0) return new Map();

    const txs = await this.prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        impactsAccountBalance: true,
        nature: { not: TransactionNature.INTERNAL_TRANSFER },
        ...(cutoff ? { date: { lte: cutoff } } : {}),
      },
      select: {
        accountId: true,
        direction: true,
        amount: true,
        date: true,
        category: { select: { kind: true } },
      },
    });

    const deltas = new Map<string, number>();
    for (const tx of txs) {
      const anchor = anchors.get(tx.accountId);
      if (anchor && tx.date <= anchor.asOfDate) continue;
      const impact = impactOf(tx.category?.kind, tx.direction);
      if (!impact.affectsAccountBalance) continue;
      const amount = Number(tx.amount);
      const signed = tx.direction === Direction.INCOME ? amount : -amount;
      deltas.set(tx.accountId, (deltas.get(tx.accountId) ?? 0) + signed);
    }
    return deltas;
  }

  private withCurrentBalance<T extends { id: string; initialBalance: unknown }>(
    account: T,
    anchors: Map<string, BalanceAnchor>,
    deltas: Map<string, number>,
  ) {
    const anchor = anchors.get(account.id);
    const base = anchor ? anchor.endBalance : Number(account.initialBalance);
    const delta = deltas.get(account.id) ?? 0;
    return { ...account, currentBalance: (base + delta).toFixed(2) };
  }
}
