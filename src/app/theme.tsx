import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

/**
 * Semantic colour palettes for the two appearances (V1). Components read colours either from the
 * MUI palette (`theme.palette.*`) or from `tokens.colors`, which are CSS custom properties set by
 * AppearanceProvider, so static `sx` values follow the active appearance without re-importing.
 * Restrained green for the primary action; colour carries meaning (status), never decoration.
 */
export type AppearanceMode = 'light' | 'dark';

export interface SemanticPalette {
  bg: string;
  surface: string;
  surfaceSoft: string;
  surfaceRaised: string;
  line: string;
  lineStrong: string;
  /** Boundary of inputs/selects: ≥3:1 against bg and surfaces (WCAG 1.4.11). */
  control: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryStrong: string;
  primaryContrast: string;
  primaryTint: string;
  danger: string;
  dangerTint: string;
  warning: string;
  warningTint: string;
  warningStripe: string;
  success: string;
  successTint: string;
  info: string;
  infoTint: string;
  focus: string;
  scrim: string;
}

export const palettes: Record<AppearanceMode, SemanticPalette> = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSoft: '#F5F6F8',
    surfaceRaised: '#FFFFFF',
    line: '#E3E6EA',
    lineStrong: '#C9CFD6',
    control: '#858E9A',
    text: '#151A21',
    textMuted: '#58616F',
    primary: '#1D6A4E',
    primaryStrong: '#155239',
    primaryContrast: '#FFFFFF',
    primaryTint: '#EAF4EE',
    danger: '#B42318',
    dangerTint: '#FDF0EF',
    warning: '#9A4508',
    warningTint: '#FDF4EA',
    warningStripe: '#C46A15',
    success: '#1D6A4E',
    successTint: '#EAF4EE',
    info: '#1F5F8B',
    infoTint: '#EDF4FA',
    focus: '#1D6A4E',
    scrim: 'rgba(15, 20, 25, 0.45)',
  },
  dark: {
    bg: '#111418',
    surface: '#151A1F',
    surfaceSoft: '#1C2228',
    surfaceRaised: '#1E252C',
    line: '#2A3139',
    lineStrong: '#3B454F',
    control: '#6E7884',
    text: '#E9ECEF',
    textMuted: '#A7B0BB',
    primary: '#5DC29A',
    primaryStrong: '#7FD3B0',
    primaryContrast: '#0A1F16',
    primaryTint: '#16302A',
    danger: '#F28B82',
    dangerTint: '#3A1E1C',
    warning: '#F2B46A',
    warningTint: '#33270F',
    warningStripe: '#E0953F',
    success: '#5DC29A',
    successTint: '#16302A',
    info: '#86BFE6',
    infoTint: '#152A3B',
    focus: '#7FD3B0',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
};

const VAR_NAMES: Record<keyof SemanticPalette, string> = {
  bg: '--tossit-bg',
  surface: '--tossit-surface',
  surfaceSoft: '--tossit-surface-soft',
  surfaceRaised: '--tossit-surface-raised',
  line: '--tossit-line',
  lineStrong: '--tossit-line-strong',
  control: '--tossit-control',
  text: '--tossit-text',
  textMuted: '--tossit-text-muted',
  primary: '--tossit-primary',
  primaryStrong: '--tossit-primary-strong',
  primaryContrast: '--tossit-primary-contrast',
  primaryTint: '--tossit-primary-tint',
  danger: '--tossit-danger',
  dangerTint: '--tossit-danger-tint',
  warning: '--tossit-warning',
  warningTint: '--tossit-warning-tint',
  warningStripe: '--tossit-warning-stripe',
  success: '--tossit-success',
  successTint: '--tossit-success-tint',
  info: '--tossit-info',
  infoTint: '--tossit-info-tint',
  focus: '--tossit-focus',
  scrim: '--tossit-scrim',
};

/** `var(--tossit-x, <light fallback>)` — the fallback keeps tests and pre-provider renders readable. */
const v = (key: keyof SemanticPalette) => `var(${VAR_NAMES[key]}, ${palettes.light[key]})`;

/** Custom properties for one appearance (applied on :root by AppearanceProvider). */
export const cssVariables = (mode: AppearanceMode): Record<string, string> =>
  Object.fromEntries((Object.keys(VAR_NAMES) as (keyof SemanticPalette)[]).map(key => [VAR_NAMES[key], palettes[mode][key]]));

/** Mode-independent references. Use these (or theme.palette) instead of hex values in components. */
export const colors = {
  bg: v('bg'),
  surface: v('surface'),
  surfaceSoft: v('surfaceSoft'),
  surfaceRaised: v('surfaceRaised'),
  line: v('line'),
  lineStrong: v('lineStrong'),
  control: v('control'),
  text: { primary: v('text'), muted: v('textMuted') },
  primary: v('primary'),
  primaryStrong: v('primaryStrong'),
  primaryContrast: v('primaryContrast'),
  primaryTint: v('primaryTint'),
  accent: v('primaryTint'),
  danger: v('danger'),
  dangerTint: v('dangerTint'),
  warning: v('warning'),
  warningTint: v('warningTint'),
  warningStripe: v('warningStripe'),
  success: v('success'),
  successTint: v('successTint'),
  info: v('info'),
  infoTint: v('infoTint'),
  focus: v('focus'),
  scrim: v('scrim'),
};

const tokens = {
  colors,
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radius: '8px',
  typography: {
    fontFamily: '"Assistant", "Heebo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    fontSize: {
      base: '15px',
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
    soft: 'none',
    medium: '0 8px 24px rgba(0, 0, 0, 0.18)',
  },
};

export const createAppTheme = (mode: AppearanceMode): Theme => {
  const p = palettes[mode];
  const options: ThemeOptions = {
    direction: 'rtl',
    palette: {
      mode,
      primary: { main: p.primary, dark: p.primaryStrong, contrastText: p.primaryContrast },
      secondary: { main: p.info },
      error: { main: p.danger },
      warning: { main: p.warning },
      success: { main: p.success },
      info: { main: p.info },
      background: { default: p.bg, paper: p.surface },
      text: { primary: p.text, secondary: p.textMuted },
      divider: p.line,
    },
    typography: {
      fontFamily: tokens.typography.fontFamily,
      fontSize: 15,
      h1: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.3 },
      h2: { fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3 },
      h3: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.875rem' },
      button: { fontWeight: 700, textTransform: 'none' as const },
    },
    shape: { borderRadius: parseInt(tokens.radius, 10) },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: p.bg, color: p.text },
          ':focus-visible': { outline: `2px solid ${p.focus}`, outlineOffset: 2 },
        },
      },
      MuiPaper: {
        // No dark-mode elevation overlay: surfaces stay the semantic colours above.
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: tokens.radius, fontWeight: 700, textTransform: 'none', minHeight: 44 },
          // The app is RTL without a style-flipping plugin: put the icon gap on the reading side.
          startIcon: { marginLeft: 8, marginRight: -4 },
          endIcon: { marginRight: 8, marginLeft: -4 },
          contained: { '&:hover': { backgroundColor: p.primaryStrong } },
          outlined: { borderColor: p.lineStrong },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: tokens.radius, boxShadow: 'none', border: `1px solid ${p.line}` } },
      },
      MuiTextField: {
        styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: tokens.radius } } },
      },
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: p.control } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: tokens.radius, backgroundColor: p.surfaceRaised } },
      },
      MuiBackdrop: {
        styleOverrides: { root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: p.scrim } } },
      },
      MuiMenu: {
        styleOverrides: { paper: { backgroundColor: p.surfaceRaised, border: `1px solid ${p.line}` } },
      },
      MuiAlert: {
        styleOverrides: {
          standardError: { backgroundColor: p.dangerTint, color: p.text },
          standardWarning: { backgroundColor: p.warningTint, color: p.text },
          standardInfo: { backgroundColor: p.infoTint, color: p.text },
          standardSuccess: { backgroundColor: p.successTint, color: p.text },
        },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 700, minHeight: 44 } },
      },
    },
  };
  return createTheme(options);
};

/** Light theme, kept for imports/tests that render without AppearanceProvider. */
export const theme = createAppTheme('light');
export { tokens };
