import { AssetType } from '@ledger/shared';

/** Broad investment classes, the grouping a portfolio is actually read at. */
export const AssetClass = {
  FIXED_INCOME: 'Renda Fixa',
  EQUITY: 'Ações',
  OTHER: 'Outros',
} as const;

export type AssetClassName = (typeof AssetClass)[keyof typeof AssetClass];

const FIXED_INCOME = new Set<string>([
  AssetType.CDB,
  AssetType.LCI,
  AssetType.LCA,
  AssetType.TESOURO_SELIC,
  AssetType.TESOURO_IPCA,
  AssetType.TESOURO_PREFIXADO,
  AssetType.POUPANCA,
]);

const EQUITY = new Set<string>([AssetType.ACOES, AssetType.FII]);

export function assetClassOf(type: string): AssetClassName {
  if (FIXED_INCOME.has(type)) return AssetClass.FIXED_INCOME;
  if (EQUITY.has(type)) return AssetClass.EQUITY;
  return AssetClass.OTHER;
}
