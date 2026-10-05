import { describe, expect, it } from 'vitest';
import { AccountsService } from './accounts.service';
import type { PrismaService } from '../prisma/prisma.service';

interface Fixture {
  accounts: unknown[];
  importBatches: unknown[];
  transactions: unknown[];
}

/** Minimal PrismaService stub — these tests exercise balance maths, not persistence. */
function stubPrisma(fixture: Fixture): PrismaService {
  return {
    account: { findMany: async () => fixture.accounts },
    importBatch: { findMany: async () => fixture.importBatches },
    transaction: { findMany: async () => fixture.transactions },
  } as unknown as PrismaService;
}

const bank = { id: 'bank-1', name: 'XP' };

describe('AccountsService.findAll balance anchoring', () => {
  it('uses an import batch endBalance even when the batch imported no transactions', async () => {
    // An Open Finance sync of an account with no movement in the window reports a real
    // balance and zero rows. That balance is still bank truth and must survive.
    const service = new AccountsService(
      stubPrisma({
        accounts: [{ id: 'acc-1', name: 'XP · 102', initialBalance: '0', bank }],
        importBatches: [
          {
            accountId: 'acc-1',
            endBalance: '87.57',
            createdAt: new Date('2026-10-05T18:35:01Z'),
            transactions: [],
          },
        ],
        transactions: [],
      }),
    );

    const [account] = await service.findAll();
    expect(account.currentBalance).toBe('87.57');
  });

  it('prefers the newest transaction date as the anchor when the batch has rows', async () => {
    const service = new AccountsService(
      stubPrisma({
        accounts: [{ id: 'acc-1', name: 'Conta', initialBalance: '0', bank }],
        importBatches: [
          {
            accountId: 'acc-1',
            endBalance: '100.00',
            createdAt: new Date('2026-10-05T00:00:00Z'),
            transactions: [{ date: new Date('2026-09-30T00:00:00Z') }],
          },
        ],
        // Posted after the anchor date, so it moves the balance.
        transactions: [
          {
            accountId: 'acc-1',
            direction: 'INCOME',
            amount: '25.00',
            date: new Date('2026-10-01T00:00:00Z'),
            category: null,
          },
        ],
      }),
    );

    const [account] = await service.findAll();
    expect(account.currentBalance).toBe('125.00');
  });

  it('ignores transactions at or before the anchor date, which the endBalance already includes', async () => {
    const service = new AccountsService(
      stubPrisma({
        accounts: [{ id: 'acc-1', name: 'Conta', initialBalance: '0', bank }],
        importBatches: [
          {
            accountId: 'acc-1',
            endBalance: '100.00',
            createdAt: new Date('2026-10-05T00:00:00Z'),
            transactions: [{ date: new Date('2026-09-30T00:00:00Z') }],
          },
        ],
        transactions: [
          {
            accountId: 'acc-1',
            direction: 'EXPENSE',
            amount: '40.00',
            date: new Date('2026-09-29T00:00:00Z'),
            category: null,
          },
        ],
      }),
    );

    const [account] = await service.findAll();
    expect(account.currentBalance).toBe('100.00');
  });

  it('falls back to initialBalance when no batch carries an endBalance', async () => {
    const service = new AccountsService(
      stubPrisma({
        accounts: [{ id: 'acc-1', name: 'Conta', initialBalance: '10.00', bank }],
        importBatches: [],
        transactions: [
          {
            accountId: 'acc-1',
            direction: 'INCOME',
            amount: '5.00',
            date: new Date('2026-10-01T00:00:00Z'),
            category: null,
          },
        ],
      }),
    );

    const [account] = await service.findAll();
    expect(account.currentBalance).toBe('15.00');
  });
});
