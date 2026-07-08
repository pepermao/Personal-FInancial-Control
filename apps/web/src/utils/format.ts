const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const brlSigned = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'exceptZero',
});

/** Format a numeric value or Decimal string as pt-BR BRL currency. */
export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return brl.format(0);
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return brl.format(0);
  return brl.format(n);
}

export function formatBRLSigned(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return brlSigned.format(0);
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return brlSigned.format(0);
  return brlSigned.format(n);
}

/**
 * Normalize a user-typed currency string into a canonical "12345.67" form ready for API/Decimal.
 *
 * Handles pt-BR (`.` thousand separator, `,` decimal) and en-US (`,` thousand, `.` decimal).
 * Rule: if the string contains a comma, treat it as pt-BR — strip all dots (thousand
 * separators) and swap the last comma for a dot. Otherwise treat as en-US and pass through.
 *
 * Examples:
 *   "11.969,80"   → "11969.80"
 *   "11969,80"    → "11969.80"
 *   "11969.80"    → "11969.80"
 *   "1,234,567.89"→ "1234567.89"   (en-US with grouping)
 *   ""            → ""
 *   "-40,46"      → "-40.46"
 */
export function parseBRLInput(raw: string): string {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (trimmed === '') return '';

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  if (hasComma && hasDot) {
    // Ambiguous format: whichever separator appears last is the decimal.
    const lastComma = trimmed.lastIndexOf(',');
    const lastDot = trimmed.lastIndexOf('.');
    if (lastComma > lastDot) {
      // pt-BR: dots are grouping, comma is decimal.
      return trimmed.replace(/\./g, '').replace(',', '.');
    }
    // en-US: commas are grouping, dot is decimal.
    return trimmed.replace(/,/g, '');
  }

  if (hasComma) {
    // Only commas — treat as pt-BR decimal (single comma) or grouping (multiple commas).
    const commaCount = (trimmed.match(/,/g) ?? []).length;
    if (commaCount === 1) return trimmed.replace(',', '.');
    // Multiple commas — assume en-US grouping without decimals.
    return trimmed.replace(/,/g, '');
  }

  // No comma — en-US style, use as-is.
  return trimmed;
}
