import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { Direction, TransactionNature } from '@kevin/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationRulesService } from '../classification-rules/classification-rules.service';
import { buildFingerprint, normalizeDescription } from '../common/normalize';
import {
  parseCsvAmount,
  parseCsvDate,
  pickAmount,
  pickCategory,
  pickDate,
  pickDescription,
} from '../common/csv-parsing';

interface CsvRow {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
}

/** Some statements (e.g. Itaú) mix in daily balance snapshot rows tagged as "not a transaction". */
function isNonTransactionRow(category: string | undefined): boolean {
  if (!category) return false;
  return normalizeDescription(category).includes('NAO E TRANSACAO');
}

export interface ImportResult {
  imported: number;
  duplicated: number;
  needsReview: number;
  skipped: number;
  historical: boolean;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: ClassificationRulesService,
  ) {}

  async importCsv(
    accountId: string,
    filename: string,
    buffer: Buffer,
    initialBalance?: string,
    endBalance?: string,
  ): Promise<ImportResult> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new BadRequestException(`Account ${accountId} not found`);

    if (initialBalance !== undefined) {
      await this.prisma.account.update({ where: { id: accountId }, data: { initialBalance } });
      this.logger.log(
        `Set initial balance for account ${accountId} to ${initialBalance} for this statement's period`,
      );
    }

    const rows = this.parseRows(buffer);
    this.logger.log(`Parsed ${rows.length} row(s) from "${filename}" for account ${accountId}`);

    const rules = await this.rulesService.findActiveOrderedByPriority();

    const latestExisting = await this.prisma.transaction.aggregate({
      where: { accountId },
      _max: { date: true },
    });
    const statementMaxDate = this.maxValidDate(rows);
    const historical =
      latestExisting._max.date !== null &&
      statementMaxDate !== null &&
      statementMaxDate < latestExisting._max.date;

    if (historical) {
      this.logger.log(
        `Statement's latest date ${statementMaxDate?.toISOString().slice(0, 10)} is older than the account's existing latest transaction (${latestExisting._max.date?.toISOString().slice(0, 10)}). Importing as historical: transactions will not affect the current balance.`,
      );
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        filename,
        accountId,
        imported: 0,
        duplicated: 0,
        needsReview: 0,
        historical,
        endBalance,
      },
    });

    let imported = 0;
    let duplicated = 0;
    let needsReview = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // +1 for header, +1 for 1-based line numbers

      if (isNonTransactionRow(row.category)) {
        this.logger.debug(`Row ${rowNumber}: balance snapshot row ("${row.category}"), skipping`);
        skipped += 1;
        continue;
      }

      if (!row.date || !row.description || !row.amount) {
        this.logger.warn(
          `Row ${rowNumber}: missing required column(s) (date/description/amount), skipping. Got: ${JSON.stringify(row)}`,
        );
        skipped += 1;
        continue;
      }

      const date = parseCsvDate(row.date);
      if (Number.isNaN(date.getTime())) {
        this.logger.warn(`Row ${rowNumber}: unparseable date "${row.date}", skipping`);
        skipped += 1;
        continue;
      }

      const amount = parseCsvAmount(row.amount);
      if (Number.isNaN(amount)) {
        this.logger.warn(`Row ${rowNumber}: unparseable amount "${row.amount}", skipping`);
        skipped += 1;
        continue;
      }

      const descriptionRaw = row.description;
      const descriptionNormalized = normalizeDescription(descriptionRaw);
      const fingerprint = buildFingerprint(
        accountId,
        date,
        Math.abs(amount).toFixed(2),
        descriptionNormalized,
      );

      const existing = await this.prisma.transaction.findUnique({ where: { fingerprint } });
      if (existing) {
        duplicated += 1;
        continue;
      }

      const match = rules.find((rule) =>
        descriptionNormalized.includes(normalizeDescription(rule.pattern)),
      );
      if (!match) needsReview += 1;

      const direction = amount >= 0 ? Direction.INCOME : Direction.EXPENSE;
      const competenceMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

      await this.prisma.transaction.create({
        data: {
          accountId,
          date,
          competenceMonth,
          descriptionRaw,
          descriptionNormalized,
          amount: Math.abs(amount).toFixed(2),
          direction,
          nature: direction === Direction.INCOME ? TransactionNature.INCOME : TransactionNature.EXPENSE,
          categoryId: match?.categoryId,
          subcategory: match?.subcategory,
          fingerprint,
          importBatchId: batch.id,
          // Historical statements (older than current data) don't affect any live totals —
          // dashboard KPIs stay stable when re-importing archived CSVs.
          impactsDashboardIncome: !historical,
          impactsDashboardExpense: !historical,
          impactsAccountBalance: !historical,
        },
      });
      imported += 1;
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: { imported, duplicated, needsReview },
    });

    this.logger.log(
      `Import "${filename}" finished: imported=${imported} duplicated=${duplicated} needsReview=${needsReview} skipped=${skipped} historical=${historical}`,
    );

    return { imported, duplicated, needsReview, skipped, historical };
  }

  private maxValidDate(rows: CsvRow[]): Date | null {
    let max: Date | null = null;
    for (const row of rows) {
      if (!row.date) continue;
      const date = parseCsvDate(row.date);
      if (Number.isNaN(date.getTime())) continue;
      if (max === null || date > max) max = date;
    }
    return max;
  }

  private parseRows(buffer: Buffer): CsvRow[] {
    let records: Record<string, string>[];
    try {
      records = parse(buffer, {
        columns: (header: string[]) => header.map((column) => column.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      this.logger.error(`Failed to parse CSV: ${(error as Error).message}`);
      throw new BadRequestException('Could not parse CSV file');
    }

    if (records.length > 0) {
      this.logger.debug(`Detected columns: ${Object.keys(records[0]).join(', ')}`);
    }

    return records.map((record) => ({
      date: pickDate(record),
      description: pickDescription(record),
      amount: pickAmount(record),
      category: pickCategory(record),
    }));
  }
}
