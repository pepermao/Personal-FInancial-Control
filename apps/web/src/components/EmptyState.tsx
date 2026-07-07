import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Render inside a Paper. Defaults to true. Set false when nesting inside an existing card. */
  paper?: boolean;
}

export function EmptyState({ title, description, icon, action, paper = true }: EmptyStateProps) {
  const content = (
    <Stack alignItems="center" spacing={1.25} sx={{ py: 4, px: 3, textAlign: 'center' }}>
      {icon && <Box sx={{ color: 'text.secondary', fontSize: 42, display: 'flex' }}>{icon}</Box>}
      <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{title}</Typography>
      {description && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 380 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  );
  return paper ? <Paper>{content}</Paper> : content;
}
