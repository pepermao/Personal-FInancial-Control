import { AccountType, AssetType, Direction, ProfitRateType, TransactionType } from '@ledger/shared';
import { normalizeDescription } from '../common/normalize';
import type { PluggyAccount, PluggyInvestment, PluggyTransaction } from './pluggy.client';

/** Pluggy account subtype -> Kevin AccountType. */
export function mapAccountType(account: PluggyAccount): AccountType {
  switch (account.subtype) {
    case 'CHECKING_ACCOUNT':
      return AccountType.CHECKING;
    case 'SAVINGS_ACCOUNT':
      return AccountType.SAVINGS;
    case 'CREDIT_CARD':
      return AccountType.CREDIT_CARD;
    default:
      return account.type === 'CREDIT' ? AccountType.CREDIT_CARD : AccountType.OTHER;
  }
}

/**
 * Direction comes from Pluggy's `type`, not the sign of `amount`.
 *
 * The sign convention flips between products — on credit cards a positive amount is a
 * *debit* (you owe more), while on bank accounts a positive amount is money in. `type`
 * is DEBIT (outflow) / CREDIT (inflow) on both, so it's the only safe signal.
 */
export function mapDirection(transaction: PluggyTransaction): Direction {
  return transaction.type === 'CREDIT' ? Direction.INCOME : Direction.EXPENSE;
}

const TRANSACTION_TYPE_PATTERNS: ReadonlyArray<readonly [RegExp, TransactionType]> = [
  [/\bPIX\b/, TransactionType.PIX],
  [/BOLETO|PAGAMENTO DE CONTA/, TransactionType.BOLETO],
  [/CARTAO|COMPRA CARTAO|CREDITO A VISTA|PARCELAD/, TransactionType.CARD],
  [/TED|DOC|TRANSFER/, TransactionType.TRANSFER],
  [/\bRDB\b|RENDIMENTO/, TransactionType.RDB],
  [/TARIFA|ANUIDADE|\bIOF\b|JUROS/, TransactionType.FEE],
  [/IMPOSTO|\bIR\b|IRRF|TRIBUTO/, TransactionType.TAX],
];

/** Best-effort instrument classification from the statement text. */
export function mapTransactionType(descriptionNormalized: string): TransactionType {
  for (const [pattern, type] of TRANSACTION_TYPE_PATTERNS) {
    if (pattern.test(descriptionNormalized)) return type;
  }
  return TransactionType.OTHER;
}

const TREASURY_PATTERNS: ReadonlyArray<readonly [RegExp, AssetType]> = [
  [/SELIC|LFT/, AssetType.TESOURO_SELIC],
  [/IPCA|NTN-?B/, AssetType.TESOURO_IPCA],
  [/PREFIXADO|LTN|NTN-?F/, AssetType.TESOURO_PREFIXADO],
];

/**
 * Pluggy investment -> Kevin AssetType.
 *
 * Treasury bonds all share one Pluggy subtype but map to three Kevin types, so the
 * instrument name is the only way to tell Selic from IPCA+ from prefixado.
 */
export function mapAssetType(investment: PluggyInvestment): AssetType {
  const name = normalizeDescription(investment.name ?? '');
  const subtype = (investment.subtype ?? '').toUpperCase();

  if (subtype === 'TREASURY' || /TESOURO/.test(name)) {
    for (const [pattern, type] of TREASURY_PATTERNS) {
      if (pattern.test(name)) return type;
    }
    return AssetType.TESOURO_SELIC;
  }

  switch (subtype) {
    case 'CDB':
      return AssetType.CDB;
    case 'LCI':
      return AssetType.LCI;
    case 'LCA':
      return AssetType.LCA;
    case 'REAL_ESTATE_FUND':
      return AssetType.FII;
    case 'STOCK':
    case 'ETF':
      return AssetType.ACOES;
    default:
      break;
  }

  if (/\bCDB\b/.test(name)) return AssetType.CDB;
  if (/\bLCI\b/.test(name)) return AssetType.LCI;
  if (/\bLCA\b/.test(name)) return AssetType.LCA;
  if (/POUPANCA/.test(name)) return AssetType.POUPANCA;
  if (investment.type === 'EQUITY') return AssetType.ACOES;

  return AssetType.OTHER;
}

/**
 * The 3-digit COMPE bank code from a Pluggy `transferNumber`.
 *
 * Format is `"<compe>/<branch>/<account>"` (e.g. `"348/0001/01946356-6"`). It is the only
 * field that separates accounts a broker exposes under one account number: XP returns the
 * same name and number for 348 (Banco XP) and 102 (XP Investimentos).
 */
export function compeFromTransferNumber(transferNumber: string | null | undefined): string | null {
  if (typeof transferNumber !== 'string' || !transferNumber.includes('/')) return null;
  const code = transferNumber.split('/', 1)[0].trim();
  return /^\d+$/.test(code) ? code.padStart(3, '0') : null;
}

/**
 * Issuer for concentration and FGC analysis.
 *
 * Pluggy leaves `issuer` null on treasury bonds, which would otherwise lump the whole
 * position under "unknown" and make concentration figures meaningless. Treasury bonds
 * are issued by the National Treasury by definition, so naming it is a statement of
 * fact, not a guess. They are sovereign risk, not FGC-covered.
 */
export function mapIssuer(investment: PluggyInvestment): string | null {
  if (investment.issuer) return investment.issuer;
  const subtype = (investment.subtype ?? '').toUpperCase();
  if (subtype === 'TREASURY' || /TESOURO/.test(normalizeDescription(investment.name ?? ''))) {
    return 'Tesouro Nacional';
  }
  return null;
}

/** Pluggy rateType -> Kevin ProfitRateType. */
export function mapProfitRateType(investment: PluggyInvestment): ProfitRateType {
  const raw = normalizeDescription(investment.rateType ?? '');
  if (/CDI|DI/.test(raw)) return ProfitRateType.CDI_PERCENTAGE;
  if (/IPCA/.test(raw)) return ProfitRateType.IPCA_PLUS;
  if (/SELIC/.test(raw)) return ProfitRateType.SELIC_PLUS;
  if (/PREFIXADO|PRE|FIXED/.test(raw)) return ProfitRateType.PREFIXADO;
  if (/POUPANCA/.test(raw)) return ProfitRateType.POUPANCA;
  return ProfitRateType.NONE;
}

/**
 * The value actually held today.
 *
 * Pluggy populates these inconsistently across connectors: `balance` is the current
 * position for most, `value` is the unit price for quantity-based holdings. Preferring
 * `balance` and falling back avoids silently recording a unit price as a position.
 */
export function investmentValue(investment: PluggyInvestment): number | null {
  if (typeof investment.balance === 'number') return investment.balance;
  if (typeof investment.amount === 'number') return investment.amount;
  if (typeof investment.value === 'number' && typeof investment.quantity === 'number') {
    return investment.value * investment.quantity;
  }
  if (typeof investment.value === 'number') return investment.value;
  return null;
}
