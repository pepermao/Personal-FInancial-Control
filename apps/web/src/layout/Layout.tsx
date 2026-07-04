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
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import WalletOutlined from '@mui/icons-material/WalletOutlined';

const DRAWER_WIDTH = 236;

const NAV_ITEMS = [
  { label: 'Painel', to: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Transações', to: '/transactions', icon: <ReceiptLongOutlined /> },
  { label: 'Contas', to: '/accounts', icon: <AccountBalanceOutlined /> },
  { label: 'Ativos', to: '/assets', icon: <SavingsOutlined /> },
  { label: 'Categorias', to: '/categories', icon: <CategoryOutlined /> },
  { label: 'Regras', to: '/rules', icon: <RuleOutlined /> },
  { label: 'Importações', to: '/imports', icon: <UploadFileOutlined /> },
  { label: 'Configurações', to: '/settings', icon: <SettingsOutlined /> },
];

export function Layout() {
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
            backgroundColor: '#FCFCFD',
            borderRight: '1px solid #ECEEF0',
            padding: '18px 14px',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.375} sx={{ px: 1, pb: 2.5 }}>
          <Box
            sx={{
              flex: '0 0 32px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9px',
              backgroundColor: '#11273A',
              color: '#FFFFFF',
            }}
          >
            <WalletOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="h6" noWrap sx={{ fontSize: 19 }}>
            Ledger
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
                color: '#6B7680',
                '& .MuiListItemIcon-root': { color: '#6B7680', minWidth: 34 },
                '& .MuiListItemText-primary': { fontSize: 13.5, fontWeight: 600 },
                '&.active': {
                  backgroundColor: '#EEF1F3',
                  color: '#16202A',
                  '& .MuiListItemIcon-root': { color: '#16202A' },
                },
                '&:hover': { backgroundColor: '#F2F4F6' },
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
          sx={{ px: 1, py: 1, borderTop: '1px solid #ECEEF0', mt: 1, pt: 2 }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#11273A', fontSize: 13, fontWeight: 700 }}>
            LG
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>Ledger</Typography>
            <Typography sx={{ fontSize: 11.5, color: '#7A868E', lineHeight: 1.3 }}>Pessoal</Typography>
          </Box>
        </Stack>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3.5, minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
