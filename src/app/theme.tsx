import { createTheme, ThemeOptions } from '@mui/material/styles';

// Design System Tokens - WCAG Friendly
const tokens = {
  colors: {
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    text: {
      primary: '#0B1220',
      muted: '#55607A',
    },
    primary: '#0F766E',
    primaryContrast: '#FFFFFF',
    accent: '#99F6E4',
    warning: '#F59E0B',
    danger: '#E11D48',
    success: '#16A34A',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radius: '10px',
  typography: {
    fontFamily: '"Inter", "Heebo", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: {
      base: '14px',
      lg: '16px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  shadows: {
    soft: '0 2px 8px rgba(0, 0, 0, 0.08)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },
};

const themeOptions: ThemeOptions = {
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: tokens.colors.primary,
      contrastText: tokens.colors.primaryContrast,
    },
    secondary: {
      main: tokens.colors.accent,
    },
    error: {
      main: tokens.colors.danger,
    },
    warning: {
      main: tokens.colors.warning,
    },
    success: {
      main: tokens.colors.success,
    },
    background: {
      default: tokens.colors.bg,
      paper: tokens.colors.surface,
    },
    text: {
      primary: tokens.colors.text.primary,
      secondary: tokens.colors.text.muted,
    },
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    fontSize: 14,
    h1: {
      fontSize: '2rem',
      fontWeight: tokens.typography.fontWeight.bold,
      color: tokens.colors.text.primary,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: tokens.typography.fontWeight.bold,
      color: tokens.colors.text.primary,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: tokens.typography.fontWeight.semibold,
      color: tokens.colors.text.primary,
    },
    body1: {
      fontSize: tokens.typography.fontSize.base,
      color: tokens.colors.text.primary,
    },
    body2: {
      fontSize: tokens.typography.fontSize.base,
      color: tokens.colors.text.muted,
    },
    button: {
      fontWeight: tokens.typography.fontWeight.semibold,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: parseInt(tokens.radius),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius,
          fontWeight: tokens.typography.fontWeight.semibold,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: tokens.shadows.soft,
          },
        },
        contained: {
          backgroundColor: tokens.colors.primary,
          color: tokens.colors.primaryContrast,
          '&:hover': {
            backgroundColor: '#0d6660',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius,
          boxShadow: tokens.shadows.soft,
          border: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: tokens.radius,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius,
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
export { tokens };
