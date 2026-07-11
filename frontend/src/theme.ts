import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6F4E37',
      light: '#8D6E63',
      dark: '#4E342E',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C9A66B',
      contrastText: '#3E2723',
    },
    success: {
      main: '#4B7B4E',
    },
    error: {
      main: '#A94442',
    },
    warning: {
      main: '#C77B2E',
    },
    info: {
      main: '#6D8B94',
    },
    background: {
      default: '#FAF6F1',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3E2723',
      secondary: '#6D4C41',
    },
    divider: '#E4D9CC',
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
});
