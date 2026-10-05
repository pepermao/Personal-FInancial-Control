import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationRulesService } from '../classification-rules/classification-rules.service';
import { classify } from '../common/classify';
import { buildFingerprint, normalizeDescription } from '../common/normalize';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

export interface ReclassifyResult {
  scanned: number;
  updated: number;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: ClassificationRulesService,
  ) {}

  findAll(query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = {
      accountId: query.accountId,
      categoryId: query.categoryId,
      competenceMonth: query.competenceMonth,
      direction: query.direction,
      type: query.type,
      nature: query.nature,
      ...(query.search
        ? { descriptionNormalized: { contains: query.search.toUpperCase() } }
        : {}),
    };

    return this.prisma.transaction.findMany({
      where,
      include: { account: { include: { bank: true } }, category: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: { include: { bank: true } }, category: true },
    });
    if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);
    return transaction;
  }

  create(dto: CreateTransactionDto) {
    const descriptionNormalized =
      dto.descriptionNormalized ?? normalizeDescription(dto.descriptionRaw);
    const date = new Date(dto.date);
    const fingerprint = buildFingerprint(dto.accountId, date, dto.amount, descriptionNormalized);

    return this.prisma.transaction.create({
      data: { ...dto, date, descriptionNormalized, fingerprint },
    });
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(id);
    const date = dto.date ? new Date(dto.date) : existing.date;
    const descriptionNormalized =
      dto.descriptionNormalized ??
      (dto.descriptionRaw ? normalizeDescription(dto.descriptionRaw) : existing.descriptionNormalized);
    const amount = dto.amount ?? existing.amount.toString();
    const fingerprint = buildFingerprint(existing.accountId, date, amount, descriptionNormalized);

    return this.prisma.transaction.update({
      where: { id },
      data: { ...dto, date, descriptionNormalized, fingerprint },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.transaction.delete({ where: { id } });
  }

  /** Re-applies active classification rules to every transaction. Only overwrites when a rule matches. */
  /**
   * Re-applies classification to every transaction.
   *
   * A rule match always wins and overwrites — that is how editing a rule propagates. The
   * Pluggy-label fallback only fills rows that are still uncategorised, so it never undoes a
   * category someone picked by hand.
   */
  async reclassifyAll(): Promise<ReclassifyResult> {
    const [transactions, rules, categories] = await Promise.all([
      this.prisma.transaction.findMany({
        select: {
          id: true,
          descriptionNormalized: true,
          pluggyCategory: true,
          categoryId: true,
          subcategory: true,
        },
      }),
      this.rulesService.findActiveOrderedByPriority(),
      this.prisma.category.findMany({ where: { parentId: null }, select: { id: true, name: true } }),
    ]);
    const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

    let updated = 0;
    for (const tx of transactions) {
      const match = classify(tx.descriptionNormalized, tx.pluggyCategory, rules, categoryIdByName);
      if (!match) continue;
      if (match.source === 'pluggy' && tx.categoryId) continue;
      if (match.categoryId === tx.categoryId && (match.subcategory ?? null) === (tx.subcategory ?? null)) {
        continue;
      }
      await this.prisma.transaction.update({
        where: { id: tx.id },
        data: { categoryId: match.categoryId, subcategory: match.subcategory },
      });
      updated += 1;
    }

    this.logger.log(`Reclassified transactions: scanned=${transactions.length} updated=${updated}`);
    return { scanned: transactions.length, updated };
  }
}
