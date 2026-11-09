import { getExpiredNotDiscardedItems, type Item } from './firestoreAPI';
/** Scoped inventory read retained; delivery and shift-ending run only on the server. */
export const checkExpiredItems = (businessId: string): Promise<Item[]> => getExpiredNotDiscardedItems(businessId);
export async function sendExpiredItemsNotifications(businessId: string, userId?: string): Promise<void> { void businessId; void userId; }
export async function manageShiftsAtMidnight(businessId: string, autoEndShifts = false): Promise<void> { void businessId; void autoEndShifts; }
export function setupPeriodicChecks(businessId: string, userId?: string, checkInterval = 60000): null { void businessId; void userId; void checkInterval; return null; }
export function clearPeriodicChecks(intervalId: ReturnType<typeof setInterval> | null): void { if (intervalId !== null) clearInterval(intervalId); }
export function isTimeToRun(hour: number, minute: number): boolean {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return Number(parts.hour) === hour && Number(parts.minute) === minute;
}
