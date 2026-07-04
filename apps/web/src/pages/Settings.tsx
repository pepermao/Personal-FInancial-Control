import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4">Settings</Typography>
      <Typography sx={{ fontSize: 13, color: '#7A868E', mt: 0.5, mb: 3 }}>
        Preferences and workspace configuration
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 480 }}>
        <Typography sx={{ color: '#7A868E' }}>Coming soon.</Typography>
      </Paper>
    </Box>
  );
}
