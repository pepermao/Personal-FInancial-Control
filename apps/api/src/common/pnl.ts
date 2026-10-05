import { CategoryKind, TransactionNature } from '@ledger/shared';

/**
 * Centralises "what counts as real income/expense" so every aggregation agrees.
 *
 * Two families of movement look like income or expense but are not:
 *
 * - **Internal transfers** — money moving between the user's own accounts. Both legs
 *   cancel out, so counting either inflates both sides.
 * - **Investment flows** — applications and redemptions. These are one-sided movements
 *   whose counterpart is an `Asset` position, not another account. Buying a CDB is not
 *   spending money, and redeeming it is not earning any; the money simply changes form.
 *
 * Excluding investment flows is what keeps the dashboard honest once positions are known
 * from Open Finance: without it, R$1.000 moved into a Caixinha is reported as R$1.000 of
 * expense *and* shows up again as R$1.000 of assets.
 */
export function countsAsPnl(
  nature: string,
  categoryKind: string | null | undefined,
): boolean {
  return !isInternalTransfer(nature, categoryKind) && !isInvestmentFlow(nature, categoryKind);
}

/** True when a transaction moves money between the user's own accounts — neither leg is income or expense. */
export function isInternalTransfer(
  nature: string,
  categoryKind: string | null | undefined,
): boolean {
  return nature === TransactionNature.INTERNAL_TRANSFER || categoryKind === CategoryKind.TRANSFER;
}

/** True when a transaction moves money to or from the user's own asset positions. */
export function isInvestmentFlow(
  nature: string,
  categoryKind: string | null | undefined,
): boolean {
  return (
    nature === TransactionNature.INVESTMENT ||
    nature === TransactionNature.REDEMPTION ||
    categoryKind === CategoryKind.INVESTMENT
  );
}
