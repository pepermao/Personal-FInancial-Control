import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLSigned } from './format';

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
