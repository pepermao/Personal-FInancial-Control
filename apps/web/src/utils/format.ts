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
