import { CategoryKind, Direction } from '@ledger/shared';

/** How a transaction of a given kind (or uncategorized, falling back to direction) affects money flows. */
export interface KindImpact {
  /** Adds to dashboard totalIncome. */
  addsToIncome: boolean;
  /** Adds to dashboard totalExpense. */
  addsToExpense: boolean;
  /** Subtracts from dashboard totalExpense (reimbursements offset original expense). */
  subtractsFromExpense: boolean;
  /** Moves account balance according to direction. */
  affectsAccountBalance: boolean;
}

export function impactOf(
  kind: string | null | undefined,
  direction: string,
): KindImpact {
  if (!kind) {
    return {
      addsToIncome: direction === Direction.INCOME,
      addsToExpense: direction === Direction.EXPENSE,
      subtractsFromExpense: false,
      affectsAccountBalance: true,
    };
  }
  switch (kind) {
    case CategoryKind.INCOME:
      return { addsToIncome: true, addsToExpense: false, subtractsFromExpense: false, affectsAccountBalance: true };
    case CategoryKind.EXPENSE:
      return { addsToIncome: false, addsToExpense: true, subtractsFromExpense: false, affectsAccountBalance: true };
    case CategoryKind.TRANSFER:
    case CategoryKind.INVESTMENT:
      // Money physically leaves/enters the account — matches bank statement.
      // Dashboard income/expense stays untouched (it's not consumption).
      return { addsToIncome: false, addsToExpense: false, subtractsFromExpense: false, affectsAccountBalance: true };
    case CategoryKind.REIMBURSEMENT:
      return { addsToIncome: false, addsToExpense: false, subtractsFromExpense: true, affectsAccountBalance: true };
    default:
      return {
        addsToIncome: direction === Direction.INCOME,
        addsToExpense: direction === Direction.EXPENSE,
        subtractsFromExpense: false,
        affectsAccountBalance: true,
      };
  }
}
