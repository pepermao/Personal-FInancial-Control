import { describe, expect, it } from 'vitest';
import { AccountType, AssetType, Direction, ProfitRateType, TransactionType } from '@kevin/shared';
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
import type { PluggyAccount, PluggyInvestment, PluggyTransaction } from './pluggy.client';

function account(overrides: Partial<PluggyAccount>): PluggyAccount {
  return {
    id: 'acc-1',
    itemId: 'item-1',
    type: 'BANK',
    subtype: 'CHECKING_ACCOUNT',
    number: '123',
    name: 'Conta Corrente',
    marketingName: 'Nubank',
    balance: 100,
    currencyCode: 'BRL',
    owner: null,
    taxNumber: null,
    ...overrides,
  };
}

function transaction(overrides: Partial<PluggyTransaction>): PluggyTransaction {
  return {
    id: 'tx-1',
    description: 'PIX ENVIADO',
    descriptionRaw: 'PIX ENVIADO',
    currencyCode: 'BRL',
    amount: -50,
    date: '2026-01-10T00:00:00.000Z',
    balance: null,
    category: null,
    accountId: 'acc-1',
    providerCode: null,
    providerId: null,
    status: 'POSTED',
    type: 'DEBIT',
    ...overrides,
  };
}

function investment(overrides: Partial<PluggyInvestment>): PluggyInvestment {
  return {
    id: 'inv-1',
    itemId: 'item-1',
    type: 'FIXED_INCOME',
    subtype: null,
    name: 'CDB Banco X',
    number: null,
    balance: null,
    value: null,
    quantity: null,
    amount: null,
    rate: null,
    annualRate: null,
    rateType: null,
    issuer: null,
    issueDate: null,
    dueDate: null,
    isin: null,
    ...overrides,
  };
}

describe('mapAccountType', () => {
  it('maps known subtypes', () => {
    expect(mapAccountType(account({ subtype: 'CHECKING_ACCOUNT' }))).toBe(AccountType.CHECKING);
    expect(mapAccountType(account({ subtype: 'SAVINGS_ACCOUNT' }))).toBe(AccountType.SAVINGS);
    expect(mapAccountType(account({ subtype: 'CREDIT_CARD' }))).toBe(AccountType.CREDIT_CARD);
  });

  it('falls back to CREDIT_CARD for unknown subtypes on credit accounts', () => {
    expect(mapAccountType(account({ type: 'CREDIT', subtype: 'WAT' }))).toBe(
      AccountType.CREDIT_CARD,
    );
    expect(mapAccountType(account({ type: 'BANK', subtype: 'WAT' }))).toBe(AccountType.OTHER);
  });
});

describe('mapDirection', () => {
  it('uses type, not the sign of amount', () => {
    // Credit cards report a purchase as a positive amount; it is still an outflow.
    expect(mapDirection(transaction({ amount: 120, type: 'DEBIT' }))).toBe(Direction.EXPENSE);
    // Bank accounts report an outflow as negative; a refund is a CREDIT despite the sign.
    expect(mapDirection(transaction({ amount: -120, type: 'CREDIT' }))).toBe(Direction.INCOME);
  });
});

describe('mapTransactionType', () => {
  it('classifies common Brazilian statement wording', () => {
    expect(mapTransactionType('PIX ENVIADO JOAO')).toBe(TransactionType.PIX);
    expect(mapTransactionType('PAGAMENTO DE CONTA BOLETO')).toBe(TransactionType.BOLETO);
    expect(mapTransactionType('TED RECEBIDA')).toBe(TransactionType.TRANSFER);
    expect(mapTransactionType('TARIFA MENSALIDADE')).toBe(TransactionType.FEE);
    expect(mapTransactionType('ALGO QUALQUER')).toBe(TransactionType.OTHER);
  });
});

describe('mapAssetType', () => {
  it('separates treasury bonds by instrument name', () => {
    expect(mapAssetType(investment({ subtype: 'TREASURY', name: 'Tesouro Selic 2029' }))).toBe(
      AssetType.TESOURO_SELIC,
    );
    expect(mapAssetType(investment({ subtype: 'TREASURY', name: 'Tesouro IPCA+ 2035' }))).toBe(
      AssetType.TESOURO_IPCA,
    );
    expect(mapAssetType(investment({ subtype: 'TREASURY', name: 'Tesouro Prefixado 2027' }))).toBe(
      AssetType.TESOURO_PREFIXADO,
    );
  });

  it('maps subtypes and falls back to the name', () => {
    expect(mapAssetType(investment({ subtype: 'REAL_ESTATE_FUND' }))).toBe(AssetType.FII);
    expect(mapAssetType(investment({ subtype: 'STOCK' }))).toBe(AssetType.ACOES);
    expect(mapAssetType(investment({ subtype: null, name: 'CDB Liquidez Diaria' }))).toBe(
      AssetType.CDB,
    );
    expect(mapAssetType(investment({ subtype: null, name: 'Coisa Desconhecida' }))).toBe(
      AssetType.OTHER,
    );
  });
});

describe('mapProfitRateType', () => {
  it('maps Brazilian index names', () => {
    expect(mapProfitRateType(investment({ rateType: 'CDI' }))).toBe(ProfitRateType.CDI_PERCENTAGE);
    expect(mapProfitRateType(investment({ rateType: 'IPCA' }))).toBe(ProfitRateType.IPCA_PLUS);
    expect(mapProfitRateType(investment({ rateType: null }))).toBe(ProfitRateType.NONE);
  });
});

describe('investmentValue', () => {
  it('prefers balance over unit price', () => {
    expect(investmentValue(investment({ balance: 1000, value: 10, quantity: 5 }))).toBe(1000);
  });

  it('multiplies unit price by quantity when there is no balance', () => {
    expect(investmentValue(investment({ value: 10, quantity: 5 }))).toBe(50);
  });

  it('returns null when nothing usable is present', () => {
    expect(investmentValue(investment({}))).toBeNull();
  });
});

describe('mapIssuer', () => {
  it('keeps the issuer Pluggy reports', () => {
    expect(mapIssuer(investment({ issuer: 'Banco X' }))).toBe('Banco X');
  });

  it('names the National Treasury for treasury bonds, which Pluggy leaves null', () => {
    expect(mapIssuer(investment({ subtype: 'TREASURY', name: 'Tesouro Selic 2031' }))).toBe(
      'Tesouro Nacional',
    );
  });

  it('leaves other unknown issuers null rather than guessing', () => {
    expect(mapIssuer(investment({ subtype: 'CDB', name: 'CDB Qualquer' }))).toBeNull();
  });
});

describe('compeFromTransferNumber', () => {
  it('extracts the bank code that separates two accounts sharing a number', () => {
    // XP reports the same name and number for Banco XP and XP Investimentos; only the
    // COMPE code tells them apart.
    expect(compeFromTransferNumber('348/0001/01946356-6')).toBe('348');
    expect(compeFromTransferNumber('102/0001/01946356-6')).toBe('102');
  });

  it('zero-pads short codes', () => {
    expect(compeFromTransferNumber('77/0001/123-4')).toBe('077');
  });

  it('returns null when absent or unparseable', () => {
    expect(compeFromTransferNumber(null)).toBeNull();
    expect(compeFromTransferNumber(undefined)).toBeNull();
    expect(compeFromTransferNumber('no-slashes')).toBeNull();
    expect(compeFromTransferNumber('abc/0001/123')).toBeNull();
  });
});
