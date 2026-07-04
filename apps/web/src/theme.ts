import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

const fontSans = '"Open Sans", -apple-system, "system-ui", "Segoe UI", Roboto, sans-serif';
const fontSerif = '"Noticia Text", Georgia, "Times New Roman", serif';

const lightPalette = {
  primary: { main: '#16202A', contrastText: '#FFFFFF' },
  success: { main: '#0E9D63' },
  error: { main: '#C7443F' },
  background: { default: '#F6F7F8', paper: '#FFFFFF' },
  text: { primary: '#16202A', secondary: '#7A868E' },
  divider: '#ECEEF0',
};

const darkPalette = {
  primary: { main: '#ECEEF0', contrastText: '#0F1418' },
  success: { main: '#3BBF8A' },
  error: { main: '#E05954' },
  background: { default: '#0F1418', paper: '#171E25' },
  text: { primary: '#ECEEF0', secondary: '#8A939B' },
  divider: '#232C34',
};

export function buildTheme(mode: PaletteMode): Theme {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  return createTheme(
    {
      palette: { mode, ...palette },
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
            body: { backgroundColor: palette.background.default },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              boxShadow: 'none',
            },
            outlined: {
              border: `1px solid ${palette.divider}`,
            },
          },
          defaultProps: {
            variant: 'outlined',
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              border: `1px solid ${palette.divider}`,
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
              color: palette.text.secondary,
              borderBottom: `1px solid ${palette.divider}`,
            },
            body: {
              borderBottom: `1px solid ${palette.divider}`,
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
              borderColor: palette.divider,
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
                backgroundColor: palette.success.main,
                opacity: 1,
              },
            },
          },
        },
      },
    },
    ptBR,
  );
}
