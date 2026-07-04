import { describe, expect, it } from 'vitest';
import { CategoryKind, Direction } from '@ledger/shared';
import { impactOf } from './category-kind';

describe('impactOf', () => {
  it('EXPENSE kind adds to expense + moves account', () => {
    expect(impactOf(CategoryKind.EXPENSE, Direction.EXPENSE)).toEqual({
      addsToIncome: false,
      addsToExpense: true,
      subtractsFromExpense: false,
      affectsAccountBalance: true,
    });
  });

  it('INCOME kind adds to income + moves account', () => {
    expect(impactOf(CategoryKind.INCOME, Direction.INCOME)).toMatchObject({
      addsToIncome: true,
      affectsAccountBalance: true,
    });
  });

  it('TRANSFER kind is invisible to dashboard totals but affects account balance', () => {
    const impact = impactOf(CategoryKind.TRANSFER, Direction.EXPENSE);
    expect(impact.addsToIncome).toBe(false);
    expect(impact.addsToExpense).toBe(false);
    expect(impact.subtractsFromExpense).toBe(false);
    expect(impact.affectsAccountBalance).toBe(true);
  });

  it('INVESTMENT behaves like TRANSFER (money moved, not consumed)', () => {
    expect(impactOf(CategoryKind.INVESTMENT, Direction.EXPENSE)).toEqual(
      impactOf(CategoryKind.TRANSFER, Direction.EXPENSE),
    );
  });

  it('REIMBURSEMENT subtracts from expense instead of adding to income', () => {
    const impact = impactOf(CategoryKind.REIMBURSEMENT, Direction.INCOME);
    expect(impact.addsToIncome).toBe(false);
    expect(impact.subtractsFromExpense).toBe(true);
    expect(impact.affectsAccountBalance).toBe(true);
  });

  it('falls back to direction when kind is missing', () => {
    expect(impactOf(null, Direction.INCOME)).toMatchObject({ addsToIncome: true });
    expect(impactOf(undefined, Direction.EXPENSE)).toMatchObject({ addsToExpense: true });
  });

  it('unknown kind falls back to direction', () => {
    expect(impactOf('WEIRD', Direction.INCOME).addsToIncome).toBe(true);
  });
});
