/**
 * Hebrew message for a failed operation. Uses the error `code` only (Firebase codes and the
 * plan's contract codes); never treats a failure as success. Falls back to the given text.
 */
export const errorMessage = (err: unknown, fallback: string): string => {
  const raw = (err as { code?: unknown } | null)?.code;
  const code = typeof raw === 'string' ? raw.replace(/^(functions|firestore)\//, '') : '';
  switch (code) {
    case 'permission-denied':
      return 'אין לך הרשאה לבצע פעולה זו.';
    case 'unauthenticated':
      return 'פג תוקף ההתחברות. התחבר שוב.';
    case 'unavailable':
    case 'auth/network-request-failed':
      return 'אין חיבור לשרת. בדוק את החיבור ונסה שוב.';
    case 'aborted':
      return 'פעולה אחרת על אותה רשומה עדיין מתבצעת. נסה שוב בעוד רגע.';
    case 'not-on-shift':
      return 'יש להתחיל משמרת לפני פעולה זו.';
    case 'already-closed':
      return 'הפריט כבר סומן כנגמר או כנזרק על ידי פעולה אחרת.';
    case 'catalog-changed':
      return 'הגדרות המוצר השתנו. בדוק את הפרטים ונסה שוב.';
    case 'not-found':
      return 'הפריט לא נמצא. ייתכן שנמחק.';
    case 'already-exists':
    case 'auth/email-already-in-use':
      return 'הרשומה כבר קיימת.';
    case 'invalid-input':
    case 'invalid-argument':
      return 'הנתונים שנשלחו אינם תקינים.';
    default:
      return fallback;
  }
};
