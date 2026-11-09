import { isPushConfigured } from '../utils/notificationUtils';

/** Same structural VAPID validation as enable (Codex C5); no permission, network or subscription. */
export const pushConfigured = (): boolean => isPushConfigured();

/** iPhone/iPad Safari supports Web Push only for apps added to the Home Screen (iOS 16.4+). */
export const needsHomeScreenInstall = (
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  standalone: boolean = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true),
) => /iPhone|iPad|iPod/.test(ua) && !standalone;
