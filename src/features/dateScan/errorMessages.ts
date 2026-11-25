import type { ScanRequestErrorCode } from './controller';

/** Bounded UI copy only; provider errors, tokens and image text must not reach notifications. */
export const scanRequestErrorMessages: Record<ScanRequestErrorCode, string> = {
  unauthenticated: 'יש להתחבר כדי לסרוק תאריך.',
  offline: 'הסריקה דורשת חיבור לרשת. אפשר להזין תאריך ידנית.',
  'invalid-image': 'לא התקבלה תמונה תקינה. בחר תמונה או צלם מחדש.',
  'unsupported-image': 'פורמט התמונה אינו נתמך. בחר JPEG, PNG או WebP, או הזן תאריך ידנית.',
  'image-too-large': 'התמונה גדולה מדי. צלם תקריב או חתוך לאזור התאריך.',
  timeout: 'הסריקה נמשכה יותר מדי זמן. אפשר לנסות שוב או להזין ידנית.',
  unavailable: 'הסריקה אינה זמינה כרגע. אפשר להזין תאריך ידנית.',
  'invalid-result': 'לא התקבלה תוצאת סריקה תקינה. אפשר לצלם שוב או להזין ידנית.',
  'context-changed': 'החשבון או העסק הפעיל השתנו. יש להתחיל סריקה חדשה.',
};
