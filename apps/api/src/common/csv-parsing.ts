const DATE_COLUMN_ALIASES = ['date', 'data'];
const DESCRIPTION_COLUMN_ALIASES = ['description', 'descrição', 'descricao', 'histórico', 'historico', 'title'];
const AMOUNT_COLUMN_ALIASES = ['amount', 'valor', 'value'];

export function pickColumn(record: Record<string, string>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    if (record[alias] !== undefined && record[alias] !== '') return record[alias];
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

/** Accepts ISO (YYYY-MM-DD) and Brazilian (DD/MM/YYYY) dates. */
export function parseCsvDate(raw: string): Date {
  const brazilian = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilian) {
    const [, day, month, year] = brazilian;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  return new Date(raw);
}

/** Accepts plain decimals (-115.00) and Brazilian-formatted numbers (-1.234,56). */
export function parseCsvAmount(raw: string): number {
  const trimmed = raw.trim();
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(trimmed)) {
    return Number(trimmed.replace(/\./g, '').replace(',', '.'));
  }
  return Number(trimmed);
}
