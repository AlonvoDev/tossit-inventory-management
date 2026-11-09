/**
 * Presence check only: the full validation lives in Codex's notificationUtils.
 * TODO(C5): replace with an exported isPushConfigured() helper (requested in CLAUDE_REQUESTS).
 */
export const pushConfigured = (key: unknown = import.meta.env.VITE_VAPID_PUBLIC_KEY) =>
  typeof key === 'string' && key.trim().length > 0;

/** iPhone/iPad Safari supports Web Push only for apps added to the Home Screen (iOS 16.4+). */
export const needsHomeScreenInstall = (
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  standalone: boolean = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true),
) => /iPhone|iPad|iPod/.test(ua) && !standalone;
