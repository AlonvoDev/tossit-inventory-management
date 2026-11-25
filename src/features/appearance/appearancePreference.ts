import type { AppearanceMode } from '../../app/theme';

/** Device-level, non-sensitive display preference. `system` follows the OS setting. */
export type AppearancePreference = 'light' | 'dark' | 'system';

/** Must match the inline pre-paint script in index.html. */
export const APPEARANCE_STORAGE_KEY = 'tossit.appearance';

export const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'light', label: 'בהיר' },
  { value: 'dark', label: 'כהה' },
  { value: 'system', label: 'לפי המכשיר' },
];

const isPreference = (value: unknown): value is AppearancePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/** Missing, malformed or blocked storage falls back to `system` without throwing. */
export function readAppearancePreference(storage: Pick<Storage, 'getItem'> | null | undefined = safeStorage()): AppearancePreference {
  try {
    const value = storage?.getItem(APPEARANCE_STORAGE_KEY);
    return isPreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Returns false when the preference could not be stored (private mode, quota, blocked storage). */
export function writeAppearancePreference(
  preference: AppearancePreference,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined = safeStorage(),
): boolean {
  try {
    if (!storage) return false;
    if (preference === 'system') storage.removeItem(APPEARANCE_STORAGE_KEY);
    else storage.setItem(APPEARANCE_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export const resolveAppearance = (preference: AppearancePreference, systemPrefersDark: boolean): AppearanceMode =>
  preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
