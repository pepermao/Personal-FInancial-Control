import { describe, expect, it } from 'vitest';
import { classify, type ClassifyRule } from './classify';

const categories = new Map([
  ['Receita PJ', 'cat-pj'],
  ['Alimentação', 'cat-food'],
  ['Transferência Interna', 'cat-transfer'],
]);

const rules: ClassifyRule[] = [
  { pattern: 'Caneppele Consulting', categoryId: 'cat-pj', subcategory: null },
  { pattern: 'padaria são joão', categoryId: 'cat-food', subcategory: 'Padaria' },
];

describe('classify', () => {
  it('prefers a rule over the Pluggy label', () => {
    expect(
      classify('TRANSFERENCIA RECEBIDA|VITOR CANEPPELE CONSULTING LTDA', 'Transfers', rules, categories),
    ).toEqual({ categoryId: 'cat-pj', subcategory: null, source: 'rule' });
  });

  it('normalises rule patterns before matching', () => {
    expect(classify('COMPRA NO DEBITO|PADARIA SAO JOAO', null, rules, categories)).toEqual({
      categoryId: 'cat-food',
      subcategory: 'Padaria',
      source: 'rule',
    });
  });

  it('falls back to the mapped Pluggy category', () => {
    expect(classify('IFD*NASSRI ABUD LANCHO', 'Eating out', rules, categories)).toEqual({
      categoryId: 'cat-food',
      subcategory: null,
      source: 'pluggy',
    });
    expect(classify('PAGAMENTO RECEBIDO', 'Credit card payment', rules, categories)?.categoryId).toBe(
      'cat-transfer',
    );
  });

  it('leaves ambiguous labels unclassified', () => {
    expect(classify('TRANSFERENCIA ENVIADA PELO PIX|FULANO', 'Transfers', rules, categories)).toBeNull();
    expect(classify('X', 'Third party transfers', rules, categories)).toBeNull();
  });

  it('skips a mapped category that does not exist in the database', () => {
    expect(classify('LOJA', 'Shopping', rules, categories)).toBeNull();
  });

  it('returns null with neither a rule nor a label', () => {
    expect(classify('ALGO', null, rules, categories)).toBeNull();
  });
});
