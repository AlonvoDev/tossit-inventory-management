import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppearanceContext } from './appearanceContext';
import { GlobalStyles, ThemeProvider } from '@mui/material';
import { createAppTheme, cssVariables, palettes } from '../../app/theme';
import {
  readAppearancePreference,
  resolveAppearance,
  writeAppearancePreference,
  type AppearancePreference,
} from './appearancePreference';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const systemQuery = (): MediaQueryList | null => {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  } catch {
    return null;
  }
};

/**
 * Owns the appearance preference and the MUI theme. Switching appearance only swaps the theme
 * object and CSS variables; the provider tree below it is never remounted, so drafts, dialogs,
 * queued operations and provider lifecycles are untouched.
 */
export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<AppearancePreference>(() => readAppearancePreference());
  const [systemDark, setSystemDark] = useState<boolean>(() => !!systemQuery()?.matches);
  const [saved, setSaved] = useState(true);

  // Follow OS changes. The value is only used while the preference is `system`.
  useEffect(() => {
    const query = systemQuery();
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(query.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener?.(onChange);
    return () => query.removeListener?.(onChange);
  }, []);

  const mode = resolveAppearance(preference, systemDark);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appearance = mode;
    root.style.colorScheme = mode;
    root.style.backgroundColor = palettes[mode].bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palettes[mode].bg);
  }, [mode]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    setSaved(writeAppearancePreference(next));
  }, []);

  const value = useMemo(() => ({ preference, mode, saved, setPreference }), [preference, mode, saved, setPreference]);

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <GlobalStyles styles={{ ':root': cssVariables(mode) }} />
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
};
