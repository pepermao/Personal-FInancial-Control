import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { OpenFinanceConnections } from './settings/OpenFinanceConnections';

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4">Configurações</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 3 }}>
        Preferências e configuração do espaço
      </Typography>

      <Stack spacing={3} sx={{ maxWidth: 820 }}>
        <OpenFinanceConnections />
      </Stack>
    </Box>
  );
}
