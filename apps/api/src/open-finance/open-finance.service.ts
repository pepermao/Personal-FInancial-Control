import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Direction, TransactionNature } from '@kevin/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationRulesService } from '../classification-rules/classification-rules.service';
import { buildFingerprint, normalizeDescription } from '../common/normalize';
import {
  compeFromTransferNumber,
  investmentValue,
  mapAccountType,
  mapAssetType,
  mapDirection,
  mapIssuer,
  mapProfitRateType,
  mapTransactionType,
} from './open-finance.mapping';
import { PluggyClient, PluggyAccount, PluggyTransaction } from './pluggy.client';
import { institutionNameForCompe } from './pluggy-institutions';
import { PluggyConnectionsService } from './pluggy-connections.service';

/** Open Finance exposes at most 12 months of history, so there is nothing to gain by asking for more. */
const MAX_HISTORY_DAYS = 365;

export interface AccountSyncResult {
  accountName: string;
  pluggyAccountId: string;
  imported: number;
  duplicated: number;
  needsReview: number;
  pending: number;
  balance: string;
}

export interface SyncResult {
  itemIds: string[];
  accounts: AccountSyncResult[];
  investmentsUpserted: number;
  totalImported: number;
}

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggy: PluggyClient,
    private readonly rulesService: ClassificationRulesService,
    private readonly connections: PluggyConnectionsService,
  ) {}

  async sync(days = MAX_HISTORY_DAYS, itemIdsOverride?: string[]): Promise<SyncResult> {
    const itemIds = itemIdsOverride?.length
      ? itemIdsOverride
      : await this.connections.resolveItemIds();
    if (itemIds.length === 0) {
      throw new BadRequestException(
        'No bank connected yet. Connect one from Settings, or set PLUGGY_ITEM_IDS.',
      );
    }

    const dateFrom = new Date(Date.now() - Math.min(days, MAX_HISTORY_DAYS) * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const rules = await this.rulesService.findActiveOrderedByPriority();
    const accounts: AccountSyncResult[] = [];
    let investmentsUpserted = 0;

    for (const itemId of itemIds) {
      const pluggyAccounts = await this.pluggy.fetchAccounts(itemId);
      this.logger.log(`Item ${itemId}: ${pluggyAccounts.length} account(s)`);

      // One MeuPluggy item is one bank, so the institution is decided once for the whole
      // item and shared by every account in it. That is what puts a credit card — which
      // carries no COMPE of its own — under the same bank as its chequing account.
      const bankName = this.institutionFor(pluggyAccounts);

      for (const pluggyAccount of pluggyAccounts) {
        accounts.push(await this.syncAccount(itemId, pluggyAccount, bankName, dateFrom, rules));
      }

      investmentsUpserted += await this.syncInvestments(itemId);
    }

    await this.pruneEmptyBanks();
    await this.connections.markSynced(itemIds);

    const totalImported = accounts.reduce((sum, account) => sum + account.imported, 0);
    this.logger.log(
      `Pluggy sync finished: ${totalImported} transaction(s) imported across ${accounts.length} account(s), ${investmentsUpserted} investment(s) upserted`,
    );

    return { itemIds, accounts, investmentsUpserted, totalImported };
  }

  /**
   * Institution name for a whole item, from the first account that carries a known COMPE.
   *
   * Falls back to the longest account name, which is the legal entity Pluggy reports — wordy
   * but accurate, and better than naming the bank after a card ("croma-platinum").
   */
  private institutionFor(pluggyAccounts: PluggyAccount[]): string {
    for (const account of pluggyAccounts) {
      const name = institutionNameForCompe(
        compeFromTransferNumber(account.bankData?.transferNumber),
      );
      if (name) return name;
    }

    const named = pluggyAccounts
      .map((account) => account.name?.trim())
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => b.length - a.length);
    return named[0] ?? 'Open Finance';
  }

  private async syncAccount(
    itemId: string,
    pluggyAccount: PluggyAccount,
    bankName: string,
    dateFrom: string,
    rules: Awaited<ReturnType<ClassificationRulesService['findActiveOrderedByPriority']>>,
  ): Promise<AccountSyncResult> {
    const account = await this.resolveAccount(itemId, pluggyAccount, bankName);

    // A credit card's Pluggy balance is the amount owed, which is a liability against net worth.
    const anchorBalance =
      pluggyAccount.type === 'CREDIT' ? -pluggyAccount.balance : pluggyAccount.balance;

    const transactions = await this.pluggy.fetchTransactions(pluggyAccount.id, dateFrom);

    const batch = await this.prisma.importBatch.create({
      data: {
        filename: `pluggy:${itemId}:${pluggyAccount.id}`,
        accountId: account.id,
        historical: false,
        // Bank-truth anchor: balances stay correct even though history stops at 12 months.
        endBalance: anchorBalance.toFixed(2),
      },
    });

    let imported = 0;
    let duplicated = 0;
    let needsReview = 0;
    let pending = 0;

    for (const transaction of transactions) {
      // PENDING rows are not final — amount and description can still change, which would
      // produce a second fingerprint once they post. Import only settled transactions.
      if (transaction.status === 'PENDING') {
        pending += 1;
        continue;
      }

      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        this.logger.warn(`Transaction ${transaction.id}: unparseable date "${transaction.date}"`);
        continue;
      }

      const descriptionRaw = transaction.descriptionRaw || transaction.description;
      const descriptionNormalized = normalizeDescription(descriptionRaw);
      const amount = Math.abs(transaction.amount).toFixed(2);

      // Pluggy's transaction id is the dedupe key, not the CSV-style fingerprint.
      //
      // A fingerprint of accountId|date|amount|description cannot distinguish genuinely
      // repeated purchases — three coffees at the same shop on the same day for the same
      // price are one fingerprint but three real transactions, and fingerprint dedupe
      // silently drops two of them. Pluggy issues a distinct id per transaction, so it is
      // both safer and more precise here.
      //
      // The id is folded into the fingerprint purely to satisfy its unique constraint;
      // the trade-off is that a Pluggy row will not dedupe against a CSV row describing
      // the same purchase, so an account should be fed by one importer, not both.
      const fingerprint = buildFingerprint(
        account.id,
        date,
        amount,
        `${descriptionNormalized}|pluggy:${transaction.id}`,
      );

      const existing = await this.prisma.transaction.findFirst({
        where: { pluggyTransactionId: transaction.id },
        select: { id: true },
      });
      if (existing) {
        duplicated += 1;
        continue;
      }

      const match = rules.find((rule) =>
        descriptionNormalized.includes(normalizeDescription(rule.pattern)),
      );
      if (!match) needsReview += 1;

      const direction = mapDirection(transaction);
      const competenceMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

      await this.prisma.transaction.create({
        data: {
          accountId: account.id,
          date,
          competenceMonth,
          descriptionRaw,
          descriptionNormalized,
          amount,
          direction,
          type: mapTransactionType(descriptionNormalized),
          nature:
            direction === Direction.INCOME ? TransactionNature.INCOME : TransactionNature.EXPENSE,
          categoryId: match?.categoryId,
          subcategory: match?.subcategory,
          fingerprint,
          pluggyTransactionId: transaction.id,
          importBatchId: batch.id,
        },
      });
      imported += 1;
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: { imported, duplicated, needsReview },
    });

    this.logger.log(
      `Account "${account.name}": imported=${imported} duplicated=${duplicated} needsReview=${needsReview} pending=${pending}`,
    );

    return {
      accountName: account.name,
      pluggyAccountId: pluggyAccount.id,
      imported,
      duplicated,
      needsReview,
      pending,
      balance: anchorBalance.toFixed(2),
    };
  }

  /** Finds the Kevin account linked to this Pluggy account, creating it (and its bank) on first sync. */
  private async resolveAccount(itemId: string, pluggyAccount: PluggyAccount, bankName: string) {
    const creditData = this.creditFieldsFor(pluggyAccount);

    const bank = await this.prisma.bank.upsert({
      where: { name: bankName },
      update: {},
      create: { name: bankName },
    });

    const linked = await this.prisma.account.findUnique({
      where: { pluggyAccountId: pluggyAccount.id },
    });
    if (linked) {
      // Repoint when the institution has been resolved differently than last time — that is
      // what migrates accounts filed under a product name ("croma-platinum") onto the real
      // bank without anyone having to touch the database. Limits refresh every sync too.
      if (linked.bankId === bank.id) {
        return this.prisma.account.update({ where: { id: linked.id }, data: creditData });
      }

      const taken = await this.prisma.account.findUnique({
        where: { bankId_name: { bankId: bank.id, name: linked.name } },
      });
      const name =
        taken && taken.id !== linked.id
          ? await this.disambiguate(bank.id, linked.name, pluggyAccount)
          : linked.name;

      this.logger.log(`Moving account "${linked.name}" to bank "${bankName}"`);
      return this.prisma.account.update({
        where: { id: linked.id },
        data: { bankId: bank.id, name, pluggyItemId: itemId, ...creditData },
      });
    }

    const baseName = `${pluggyAccount.name}${pluggyAccount.number ? ` (${pluggyAccount.number})` : ''}`;

    // An account may already exist from CSV imports under the same bank+name — adopt it
    // rather than creating a duplicate, so history stays on one timeline.
    const existing = await this.prisma.account.findUnique({
      where: { bankId_name: { bankId: bank.id, name: baseName } },
    });
    if (existing && !existing.pluggyAccountId) {
      this.logger.log(`Linking existing account "${baseName}" to Pluggy account ${pluggyAccount.id}`);
      return this.prisma.account.update({
        where: { id: existing.id },
        data: { pluggyAccountId: pluggyAccount.id, pluggyItemId: itemId, ...creditData },
      });
    }

    // The name is taken by a *different* Pluggy account. Brokers do this: XP reports the
    // same name and number for Banco XP (COMPE 348) and XP Investimentos (COMPE 102).
    // Adopting here would make one Kevin account flip between two Pluggy accounts on every
    // sync, mixing their transactions and alternating the balance anchor.
    const name = existing ? await this.disambiguate(bank.id, baseName, pluggyAccount) : baseName;

    this.logger.log(`Creating account "${name}" from Pluggy account ${pluggyAccount.id}`);
    return this.prisma.account.create({
      data: {
        bankId: bank.id,
        name,
        type: mapAccountType(pluggyAccount),
        accountNumber: pluggyAccount.number,
        pluggyAccountId: pluggyAccount.id,
        pluggyItemId: itemId,
        ...creditData,
      },
    });
  }

  /**
   * Removes banks left with no accounts.
   *
   * Repointing accounts onto their real institution strands the product-named rows the
   * earlier naming produced. They carry nothing but a name, so dropping them is safe.
   */
  private async pruneEmptyBanks(): Promise<void> {
    const { count } = await this.prisma.bank.deleteMany({ where: { accounts: { none: {} } } });
    if (count > 0) this.logger.log(`Removed ${count} bank(s) left without accounts`);
  }

  /** Credit-card limits and due date, null on anything that is not a card. */
  private creditFieldsFor(pluggyAccount: PluggyAccount) {
    const credit = pluggyAccount.creditData;
    const dueDate = credit?.balanceDueDate ? new Date(credit.balanceDueDate) : null;
    return {
      creditLimit: credit?.creditLimit?.toFixed(2) ?? null,
      availableCreditLimit: credit?.availableCreditLimit?.toFixed(2) ?? null,
      creditDueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
    };
  }

  /** Appends the COMPE code, then the Pluggy id, until the name is free within the bank. */
  private async disambiguate(
    bankId: string,
    baseName: string,
    pluggyAccount: PluggyAccount,
  ): Promise<string> {
    const compe = compeFromTransferNumber(pluggyAccount.bankData?.transferNumber);
    const candidates = [
      ...(compe ? [`${baseName} · ${compe}`] : []),
      `${baseName} · ${pluggyAccount.id.slice(0, 8)}`,
    ];

    for (const candidate of candidates) {
      const taken = await this.prisma.account.findUnique({
        where: { bankId_name: { bankId, name: candidate } },
      });
      if (!taken) return candidate;
    }

    // Both candidates are taken, which means this exact Pluggy account already has a row;
    // the caller's pluggyAccountId lookup would have found it, so this is unreachable in
    // practice. Fall back to something unique rather than throwing on a unique violation.
    return `${baseName} · ${pluggyAccount.id}`;
  }

  private async syncInvestments(itemId: string): Promise<number> {
    const investments = await this.pluggy.fetchInvestments(itemId);
    let upserted = 0;

    for (const investment of investments) {
      const value = investmentValue(investment);
      if (value === null) {
        this.logger.warn(`Investment ${investment.id} ("${investment.name}") has no usable value`);
        continue;
      }

      const dueDate = investment.dueDate ? new Date(investment.dueDate) : null;
      const data = {
        name: investment.name,
        type: mapAssetType(investment),
        value: value.toFixed(2),
        profitRateType: mapProfitRateType(investment),
        profitRate: investment.annualRate ?? investment.rate ?? null,
        issuer: mapIssuer(investment),
        dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      };

      await this.prisma.asset.upsert({
        where: { pluggyInvestmentId: investment.id },
        update: data,
        create: { ...data, pluggyInvestmentId: investment.id },
      });
      upserted += 1;
    }

    return upserted;
  }
}
