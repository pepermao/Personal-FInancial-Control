import { describe, expect, it } from 'vitest';
import { AssetType } from '@ledger/shared';
import { AssetClass, assetClassOf } from './asset-class';

describe('assetClassOf', () => {
  it('groups every fixed-income instrument together', () => {
    for (const type of [
      AssetType.CDB,
      AssetType.LCI,
      AssetType.LCA,
      AssetType.TESOURO_SELIC,
      AssetType.TESOURO_IPCA,
      AssetType.TESOURO_PREFIXADO,
      AssetType.POUPANCA,
    ]) {
      expect(assetClassOf(type)).toBe(AssetClass.FIXED_INCOME);
    }
  });

  it('groups stocks and real-estate funds as equity', () => {
    expect(assetClassOf(AssetType.ACOES)).toBe(AssetClass.EQUITY);
    expect(assetClassOf(AssetType.FII)).toBe(AssetClass.EQUITY);
  });

  it('falls back to Outros for anything unrecognised', () => {
    expect(assetClassOf(AssetType.OTHER)).toBe(AssetClass.OTHER);
    expect(assetClassOf('SOMETHING_NEW')).toBe(AssetClass.OTHER);
  });
});
