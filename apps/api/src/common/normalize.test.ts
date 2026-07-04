import { describe, expect, it } from 'vitest';
import { buildFingerprint, normalizeDescription } from './normalize';

describe('normalizeDescription', () => {
  it('strips diacritics + uppercases + collapses whitespace', () => {
    expect(normalizeDescription('Aplicação   em  Investimento')).toBe('APLICACAO EM INVESTIMENTO');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeDescription('  café  ')).toBe('CAFE');
  });

  it('is idempotent', () => {
    const once = normalizeDescription('Transferência PIX');
    expect(normalizeDescription(once)).toBe(once);
  });
});

describe('buildFingerprint', () => {
  const date = new Date('2026-04-15T00:00:00Z');
  const base = () => buildFingerprint('acc-1', date, '100.00', 'DECATHLON');

  it('is deterministic', () => {
    expect(base()).toBe(base());
  });

  it('depends on all inputs', () => {
    const original = base();
    expect(buildFingerprint('acc-2', date, '100.00', 'DECATHLON')).not.toBe(original);
    expect(buildFingerprint('acc-1', new Date('2026-04-16T00:00:00Z'), '100.00', 'DECATHLON')).not.toBe(original);
    expect(buildFingerprint('acc-1', date, '100.01', 'DECATHLON')).not.toBe(original);
    expect(buildFingerprint('acc-1', date, '100.00', 'UBER')).not.toBe(original);
  });

  it('produces a 64-char hex string', () => {
    expect(base()).toMatch(/^[0-9a-f]{64}$/);
  });
});
