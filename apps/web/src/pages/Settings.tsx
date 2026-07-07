import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4">Configurações</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, mb: 3 }}>
        Preferências e configuração do espaço
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Typography sx={{ color: 'text.secondary' }}>Em breve.</Typography>
      </Paper>
    </Box>
  );
}
