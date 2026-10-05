import { describe, expect, it } from 'vitest';
import { CategoryKind, TransactionNature } from '@kevin/shared';
import { countsAsPnl, isInternalTransfer, isInvestmentFlow } from './pnl';

describe('countsAsPnl', () => {
  it('counts ordinary income and expense', () => {
    expect(countsAsPnl(TransactionNature.INCOME, CategoryKind.INCOME)).toBe(true);
    expect(countsAsPnl(TransactionNature.EXPENSE, CategoryKind.EXPENSE)).toBe(true);
    expect(countsAsPnl(TransactionNature.EXPENSE, null)).toBe(true);
  });

  it('excludes internal transfers', () => {
    expect(countsAsPnl(TransactionNature.INTERNAL_TRANSFER, null)).toBe(false);
    expect(countsAsPnl(TransactionNature.EXPENSE, CategoryKind.TRANSFER)).toBe(false);
  });

  it('excludes investment flows, whose counterpart is an asset rather than an account', () => {
    // Money into a CDB is not spending; it changes form and reappears as an Asset.
    expect(countsAsPnl(TransactionNature.INVESTMENT, null)).toBe(false);
    expect(countsAsPnl(TransactionNature.REDEMPTION, null)).toBe(false);
    expect(countsAsPnl(TransactionNature.EXPENSE, CategoryKind.INVESTMENT)).toBe(false);
  });
});

describe('isInternalTransfer', () => {
  it('matches on either nature or category kind', () => {
    expect(isInternalTransfer(TransactionNature.INTERNAL_TRANSFER, null)).toBe(true);
    expect(isInternalTransfer(TransactionNature.EXPENSE, CategoryKind.TRANSFER)).toBe(true);
    expect(isInternalTransfer(TransactionNature.EXPENSE, CategoryKind.EXPENSE)).toBe(false);
  });
});

describe('isInvestmentFlow', () => {
  it('matches applications, redemptions and investment categories', () => {
    expect(isInvestmentFlow(TransactionNature.INVESTMENT, null)).toBe(true);
    expect(isInvestmentFlow(TransactionNature.REDEMPTION, null)).toBe(true);
    expect(isInvestmentFlow(TransactionNature.EXPENSE, CategoryKind.INVESTMENT)).toBe(true);
    expect(isInvestmentFlow(TransactionNature.EXPENSE, CategoryKind.EXPENSE)).toBe(false);
  });
});
