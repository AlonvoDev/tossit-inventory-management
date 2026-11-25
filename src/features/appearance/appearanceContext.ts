import { createContext, useContext } from 'react';
import type { AppearanceMode } from '../../app/theme';
import type { AppearancePreference } from './appearancePreference';

export interface AppearanceContextValue {
  preference: AppearancePreference;
  mode: AppearanceMode;
  /** false when the choice applies now but could not be saved on this device. */
  saved: boolean;
  setPreference: (preference: AppearancePreference) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/** For optional UI (e.g. the accessibility menu in isolated component tests): null outside the provider. */
export const useOptionalAppearance = (): AppearanceContextValue | null => useContext(AppearanceContext);

export const useAppearance = (): AppearanceContextValue => {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside AppearanceProvider');
  return context;
};
