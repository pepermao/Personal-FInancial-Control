import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLSigned, parseBRLInput } from './format';

// Non-breaking spaces vs regular spaces vary by ICU version; normalize before comparing.
const collapse = (s: string) => s.replace(/\s/g, ' ');

describe('formatBRL', () => {
  it('formats integer as pt-BR BRL', () => {
    expect(collapse(formatBRL(12345))).toBe('R$ 12.345,00');
  });

  it('formats decimal string', () => {
    expect(collapse(formatBRL('101484.93'))).toBe('R$ 101.484,93');
  });

  it('handles null/undefined/empty as R$ 0,00', () => {
    expect(collapse(formatBRL(null))).toBe('R$ 0,00');
    expect(collapse(formatBRL(undefined))).toBe('R$ 0,00');
    expect(collapse(formatBRL(''))).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 for NaN input', () => {
    expect(collapse(formatBRL('not-a-number'))).toBe('R$ 0,00');
  });

  it('handles negative values', () => {
    expect(collapse(formatBRL(-42.5))).toBe('-R$ 42,50');
  });
});

describe('formatBRLSigned', () => {
  it('shows + for positive', () => {
    expect(collapse(formatBRLSigned(10))).toBe('+R$ 10,00');
  });

  it('shows - for negative', () => {
    expect(collapse(formatBRLSigned(-10))).toBe('-R$ 10,00');
  });
});

describe('parseBRLInput', () => {
  it('normalizes pt-BR full form to en-US', () => {
    expect(parseBRLInput('11.969,80')).toBe('11969.80');
  });

  it('normalizes pt-BR without grouping', () => {
    expect(parseBRLInput('11969,80')).toBe('11969.80');
  });

  it('passes en-US decimal through', () => {
    expect(parseBRLInput('11969.80')).toBe('11969.80');
  });

  it('strips en-US thousand separators', () => {
    expect(parseBRLInput('1,234,567.89')).toBe('1234567.89');
  });

  it('handles negative pt-BR', () => {
    expect(parseBRLInput('-40,46')).toBe('-40.46');
  });

  it('handles empty', () => {
    expect(parseBRLInput('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(parseBRLInput('  11.969,80  ')).toBe('11969.80');
  });

  it('handles ambiguous ordering (comma last => pt-BR)', () => {
    expect(parseBRLInput('1.234.567,89')).toBe('1234567.89');
  });

  it('handles ambiguous ordering (dot last => en-US)', () => {
    expect(parseBRLInput('1,234,567.89')).toBe('1234567.89');
  });
});
