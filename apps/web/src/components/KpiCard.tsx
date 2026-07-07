import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export interface KpiCardProps {
  label: string;
  value: string;
}

/**
 * Small stat tile used on dashboards. Extracted from Dashboard.tsx + Assets.tsx to guarantee
 * both pages evolve together.
 */
export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <Paper sx={{ p: 2.25, height: '100%' }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'text.secondary',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}
