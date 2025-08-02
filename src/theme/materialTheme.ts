import { createTheme, ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/**
 * High-Level Material-UI Theme System
 * Enterprise-grade design with sophisticated colors, typography, and components
 */

// Custom Color Palette
const primaryColors = {
  50: '#f3e5f5',
  100: '#e1bee7',
  200: '#ce93d8',
  300: '#ba68c8',
  400: '#ab47bc',
  500: '#9c27b0', // Primary
  600: '#8e24aa',
  700: '#7b1fa2',
  800: '#6a1b9a',
  900: '#4a148c',
};

const secondaryColors = {
  50: '#e8f5e8',
  100: '#c8e6c8',
  200: '#a5d6a7',
  300: '#81c784',
  400: '#66bb6a',
  500: '#4caf50', // Secondary
  600: '#43a047',
  700: '#388e3c',
  800: '#2e7d32',
  900: '#1b5e20',
};

const errorColors = {
  50: '#ffebee',
  100: '#ffcdd2',
  200: '#ef9a9a',
  300: '#e57373',
  400: '#ef5350',
  500: '#f44336', // Error
  600: '#e53935',
  700: '#d32f2f',
  800: '#c62828',
  900: '#b71c1c',
};

const warningColors = {
  50: '#fff8e1',
  100: '#ffecb3',
  200: '#ffe082',
  300: '#ffd54f',
  400: '#ffca28',
  500: '#ffc107', // Warning
  600: '#ffb300',
  700: '#ffa000',
  800: '#ff8f00',
  900: '#ff6f00',
};

const infoColors = {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3', // Info
  600: '#1e88e5',
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
};

const successColors = {
  50: '#e8f5e8',
  100: '#c8e6c8',
  200: '#a5d6a7',
  300: '#81c784',
  400: '#66bb6a',
  500: '#4caf50', // Success
  600: '#43a047',
  700: '#388e3c',
  800: '#2e7d32',
  900: '#1b5e20',
};

// Advanced Gradient System
const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondary: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  success: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
  warning: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
  error: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
  info: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
  dark: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
  light: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  rainbow: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
  ocean: 'linear-gradient(135deg, #667db6 0%, #0082c8 25%, #0052cc 50%, #667db6 100%)',
  sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  forest: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
};

// Advanced Shadow System
const shadows = {
  card: '0 4px 20px 0 rgba(0,0,0,0.12)',
  cardHover: '0 8px 32px 0 rgba(0,0,0,0.18)',
  fab: '0 6px 20px rgba(0,0,0,0.15)',
  fabHover: '0 8px 28px rgba(0,0,0,0.25)',
  modal: '0 16px 48px rgba(0,0,0,0.2)',
  drawer: '0 8px 32px rgba(0,0,0,0.12)',
  appBar: '0 2px 12px rgba(0,0,0,0.08)',
  button: '0 2px 8px rgba(0,0,0,0.1)',
  buttonHover: '0 4px 16px rgba(0,0,0,0.15)',
  elevation1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  elevation2: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
  elevation3: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  elevation4: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
  elevation5: '0 20px 40px rgba(0,0,0,0.2)',
};

// Professional Typography Scale
const typography = {
  fontFamily: [
    '"Inter"',
    '"Roboto"',
    '"Segoe UI"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.57,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 2.66,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
};

// Advanced Component Customizations
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      ...primaryColors,
      main: primaryColors[500],
    },
    secondary: {
      ...secondaryColors,
      main: secondaryColors[500],
    },
    error: {
      ...errorColors,
      main: errorColors[500],
    },
    warning: {
      ...warningColors,
      main: warningColors[500],
    },
    info: {
      ...infoColors,
      main: infoColors[500],
    },
    success: {
      ...successColors,
      main: successColors[500],
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography,
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    shadows.elevation1,
    shadows.elevation2,
    shadows.elevation3,
    shadows.elevation4,
    shadows.elevation5,
    shadows.card,
    shadows.cardHover,
    shadows.modal,
    shadows.fab,
    shadows.fabHover,
    shadows.drawer,
    shadows.appBar,
    shadows.button,
    shadows.buttonHover,
    'none', // 15
    'none', // 16
    'none', // 17
    'none', // 18
    'none', // 19
    'none', // 20
    'none', // 21
    'none', // 22
    'none', // 23
    'none', // 24
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          MozOsxFontSmoothing: 'grayscale',
          WebkitFontSmoothing: 'antialiased',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
        },
        body: {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
        },
        '#root': {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: shadows.card,
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: shadows.cardHover,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '10px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: shadows.buttonHover,
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: shadows.button,
          '&:hover': {
            boxShadow: shadows.buttonHover,
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: shadows.fab,
          '&:hover': {
            boxShadow: shadows.fabHover,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
        elevation1: {
          boxShadow: shadows.elevation1,
        },
        elevation2: {
          boxShadow: shadows.elevation2,
        },
        elevation3: {
          boxShadow: shadows.elevation3,
        },
        elevation4: {
          boxShadow: shadows.elevation4,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadows.appBar,
          background: gradients.primary,
          color: '#ffffff',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '0 16px 16px 0',
          boxShadow: shadows.drawer,
          border: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          background: gradients.primary,
          color: '#ffffff',
        },
        colorSecondary: {
          background: gradients.secondary,
          color: '#ffffff',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.625rem',
          minWidth: 20,
          height: 20,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px ${alpha(primaryColors[500], 0.2)}`,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: shadows.modal,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
  },
};

// Create the theme
export const materialTheme = createTheme(themeOptions);

// Theme extensions for custom usage
export const themeExtensions = {
  gradients,
  shadows,
  colors: {
    primary: primaryColors,
    secondary: secondaryColors,
    error: errorColors,
    warning: warningColors,
    info: infoColors,
    success: successColors,
  },
  spacing: materialTheme.spacing,
  breakpoints: materialTheme.breakpoints,
};

// Utility functions for theme usage
export const getGradient = (type: keyof typeof gradients) => gradients[type];
export const getShadow = (type: keyof typeof shadows) => shadows[type];
export const getColor = (palette: keyof typeof themeExtensions.colors, shade: keyof typeof primaryColors) => 
  themeExtensions.colors[palette][shade];

export default materialTheme;