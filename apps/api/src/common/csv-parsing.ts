const DATE_COLUMN_ALIASES = ['date', 'data'];
const DESCRIPTION_COLUMN_ALIASES = ['description', 'descrição', 'descricao', 'histórico', 'historico', 'title'];
const AMOUNT_COLUMN_ALIASES = ['amount', 'valor', 'value'];
const CATEGORY_COLUMN_ALIASES = ['category', 'categoria'];

/**
 * Matches by exact column name first, then falls back to a substring match so header
 * variants like "Valor (R$)" or "Valor (US$)" are still recognized as the "valor" column.
 */
export function pickColumn(record: Record<string, string>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    if (record[alias] !== undefined && record[alias] !== '') return record[alias];
  }
  for (const [key, value] of Object.entries(record)) {
    if (value === '') continue;
    if (aliases.some((alias) => key.includes(alias))) return value;
  }
  return undefined;
}

export function pickDate(record: Record<string, string>): string | undefined {
  return pickColumn(record, DATE_COLUMN_ALIASES);
}

export function pickDescription(record: Record<string, string>): string | undefined {
  return pickColumn(record, DESCRIPTION_COLUMN_ALIASES);
}

export function pickAmount(record: Record<string, string>): string | undefined {
  return pickColumn(record, AMOUNT_COLUMN_ALIASES);
}

export function pickCategory(record: Record<string, string>): string | undefined {
  return pickColumn(record, CATEGORY_COLUMN_ALIASES);
}

/** Accepts ISO (YYYY-MM-DD) and Brazilian (DD/MM/YYYY) dates. */
export function parseCsvDate(raw: string): Date {
  const brazilian = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilian) {
    const [, day, month, year] = brazilian;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  return new Date(raw);
}

/**
 * Accepts plain decimals (-115.00) and Brazilian-formatted numbers, with or without a
 * thousands separator (-1.234,56 or -1234,56). A comma always means it's Brazilian:
 * dots (if any) are thousands separators and get stripped before the comma becomes the point.
 */
export function parseCsvAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.includes(',')) {
    return Number(trimmed.replace(/\./g, '').replace(',', '.'));
  }
  return Number(trimmed);
}
