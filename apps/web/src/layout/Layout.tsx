import { NavLink, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../theme-mode';

const DRAWER_WIDTH = 236;

const NAV_ITEMS = [
  { label: 'Painel', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Transações', to: '/transactions', icon: <ReceiptLongOutlined /> },
  { label: 'Contas', to: '/accounts', icon: <AccountBalanceOutlined /> },
  { label: 'Ativos', to: '/assets', icon: <SavingsOutlined /> },
  { label: 'Investimentos', to: '/investments', icon: <TrendingUpOutlined /> },
  { label: 'Imóveis', to: '/real-estate', icon: <ApartmentOutlined /> },
  { label: 'Categorias', to: '/categories', icon: <CategoryOutlined /> },
  { label: 'Regras', to: '/rules', icon: <RuleOutlined /> },
  { label: 'Importações', to: '/imports', icon: <UploadFileOutlined /> },
  { label: 'Configurações', to: '/settings', icon: <SettingsOutlined /> },
];

export function Layout() {
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';

  const drawerBg = isDark ? theme.palette.background.paper : '#FCFCFD';
  const activeBg = isDark ? alpha(theme.palette.primary.main, 0.12) : '#EEF1F3';
  const hoverBg = isDark ? alpha(theme.palette.primary.main, 0.06) : '#F2F4F6';
  const idleFg = theme.palette.text.secondary;
  const activeFg = theme.palette.text.primary;
  const logoBg = isDark ? theme.palette.primary.main : '#11273A';
  const logoFg = isDark ? theme.palette.primary.contrastText : '#FFFFFF';

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: drawerBg,
            borderRight: `1px solid ${theme.palette.divider}`,
            padding: '18px 14px',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.375} sx={{ px: 1, pb: 2.5 }}>
          <Box
            component="img"
            src="/kevin.jpg"
            alt="Kevin"
            sx={{
              flex: '0 0 32px',
              width: 32,
              height: 32,
              borderRadius: '9px',
              objectFit: 'cover',
              objectPosition: 'center 25%',
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Typography variant="h6" noWrap sx={{ fontSize: 19 }}>
            Kevin
          </Typography>
        </Stack>

        <List sx={{ display: 'flex', flexDirection: 'column', gap: '2px', p: 0 }}>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: '9px',
                py: 1,
                px: 1.5,
                color: idleFg,
                '& .MuiListItemIcon-root': { color: idleFg, minWidth: 34 },
                '& .MuiListItemText-primary': { fontSize: 13.5, fontWeight: 600 },
                '&.active': {
                  backgroundColor: activeBg,
                  color: activeFg,
                  '& .MuiListItemIcon-root': { color: activeFg },
                },
                '&:hover': { backgroundColor: hoverBg },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ px: 1, py: 1, borderTop: `1px solid ${theme.palette.divider}`, mt: 1, pt: 2 }}
        >
          <Avatar src="/kevin.jpg" alt="Kevin Malone" sx={{ width: 32, height: 32 }}>
            KM
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>Kevin Malone</Typography>
            <Typography sx={{ fontSize: 11.5, color: theme.palette.text.secondary, lineHeight: 1.3 }}>
              Contador
            </Typography>
          </Box>
          <Tooltip title={isDark ? 'Modo claro' : 'Modo escuro'}>
            <IconButton size="small" onClick={toggleMode} sx={{ color: idleFg }}>
              {isDark ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3.5, minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
