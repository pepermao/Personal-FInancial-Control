import { createTheme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

const fontSans = '"Open Sans", -apple-system, "system-ui", "Segoe UI", Roboto, sans-serif';
const fontSerif = '"Noticia Text", Georgia, "Times New Roman", serif';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#16202A', contrastText: '#FFFFFF' },
    success: { main: '#0E9D63' },
    error: { main: '#C7443F' },
    background: { default: '#F6F7F8', paper: '#FFFFFF' },
    text: { primary: '#16202A', secondary: '#7A868E' },
    divider: '#ECEEF0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: fontSans,
    h1: { fontFamily: fontSerif, fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: fontSerif, fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: fontSerif, fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontFamily: fontSerif, fontWeight: 700, fontSize: 23, letterSpacing: '-0.015em' },
    h5: { fontFamily: fontSerif, fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontFamily: fontSerif, fontWeight: 700, letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F6F7F8' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        outlined: {
          border: '1px solid #ECEEF0',
        },
      },
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #ECEEF0',
          borderRadius: 11,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          fontWeight: 600,
          boxShadow: 'none',
        },
        contained: {
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: 11,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#98A2A9',
          borderBottom: '1px solid #ECEEF0',
        },
        body: {
          borderBottom: '1px solid #F1F3F5',
          fontSize: 13.5,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
        },
        notchedOutline: {
          borderColor: '#DFE3E6',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#FFFFFF',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#0E9D63',
            opacity: 1,
          },
        },
      },
    },
  },
}, ptBR);
