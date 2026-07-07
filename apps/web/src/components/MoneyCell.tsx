import Typography from '@mui/material/Typography';
import { formatBRL } from '../utils/format';

export interface MoneyCellProps {
  value: string | number | null | undefined;
  /** Show negative values in error color. Defaults to false. */
  colorSigned?: boolean;
  /** Font size in px. Defaults to 13.5 (matches table body). */
  fontSize?: number;
  bold?: boolean;
}

/** Formatted BRL amount with optional sign-based coloring. */
export function MoneyCell({ value, colorSigned = false, fontSize = 13.5, bold = true }: MoneyCellProps) {
  const n = value === null || value === undefined || value === '' ? 0 : Number(value);
  const color = !colorSigned ? 'text.primary' : n < 0 ? 'error.main' : n > 0 ? 'success.main' : 'text.primary';
  return (
    <Typography component="span" sx={{ fontSize, fontWeight: bold ? 700 : 500, color }}>
      {formatBRL(value)}
    </Typography>
  );
}
