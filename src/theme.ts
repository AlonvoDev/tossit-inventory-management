import { createTheme } from '@mui/material/styles';

// Define breakpoints for different devices
const breakpoints = {
  values: {
    xs: 0,      // Mobile phones (small)
    sm: 600,    // Mobile phones (large) / Small tablets
    md: 900,    // Tablets
    lg: 1200,   // Desktop
    xl: 1536,   // Large desktop
  },
};

export const theme = createTheme({
  direction: 'rtl',
  breakpoints,
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Assistant, sans-serif',
    // Responsive typography
    h1: {
      fontSize: '2.5rem',
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontSize: '2rem',
      '@media (max-width:600px)': {
        fontSize: '1.75rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    body1: {
      fontSize: '1rem',
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
      },
    },
    button: {
      fontSize: '1rem',
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
      },
    },
  },
  spacing: 8, // Base spacing unit
  components: {
    // Enhanced button components for touch devices
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // Minimum touch target size
          padding: '12px 24px',
          '@media (max-width:600px)': {
            minHeight: 48, // Larger touch targets on mobile
            padding: '14px 20px',
            fontSize: '0.875rem',
          },
        },
      },
    },
    // Enhanced container for responsive behavior
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (max-width:600px)': {
            paddingLeft: 12,
            paddingRight: 12,
          },
        },
      },
    },
    // Enhanced paper component
    MuiPaper: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            margin: '8px',
            borderRadius: '8px',
          },
        },
      },
    },
  },
});

// Export responsive utilities
export const responsive = {
  mobile: '@media (max-width: 599px)',
  tablet: '@media (min-width: 600px) and (max-width: 899px)',
  desktop: '@media (min-width: 900px)',
  touch: '@media (hover: none) and (pointer: coarse)', // Touch devices
}; 