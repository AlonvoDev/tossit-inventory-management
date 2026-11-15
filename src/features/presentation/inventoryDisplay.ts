import { selectItems, type SelectableItem } from '../inventory/itemSelection';

/**
 * Presentation-only view of an inventory item. Status membership is taken from the existing
 * `selectItems` modes (expired / expiring / discarded / finished), never re-derived here.
 */
export type DisplayStatus = 'expired' | 'expiring' | 'ok' | 'finished' | 'discarded';

const inMode = (item: SelectableItem, mode: 'expired' | 'expiring' | 'discarded' | 'finished', nowMs: number) =>
  selectItems([item], { mode }, nowMs).length === 1;

export const displayStatus = (item: SelectableItem, nowMs: number): DisplayStatus => {
  if (inMode(item, 'discarded', nowMs)) return 'discarded';
  if (inMode(item, 'finished', nowMs)) return 'finished';
  if (inMode(item, 'expired', nowMs)) return 'expired';
  if (inMode(item, 'expiring', nowMs)) return 'expiring';
  return 'ok';
};

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  expired: 'פג תוקף',
  expiring: 'עומד לפוג',
  ok: 'בתוקף',
  finished: 'נגמר',
  discarded: 'נזרק',
};

/** Order used by the status filter; urgent first. */
export const OPEN_STATUSES: DisplayStatus[] = ['expired', 'expiring', 'ok'];

const UNIT: Record<string, string> = { kg: 'ק״ג', units: 'יח׳' };

/** "0.5 ק״ג", "6 יח׳" — the number is shown exactly as stored. */
export const formatQuantity = (amount: number, unit: string): string => `${amount} ${UNIT[unit] ?? unit}`;

const dateTime = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Business time (Asia/Jerusalem), e.g. "16.11, 01:30". */
export const formatDateTime = (ms: number): string => dateTime.format(ms);

/** Human distance to expiry, e.g. "בעוד 10 שעות", "לפני 2 ימים". Display only. */
export const relativeExpiry = (expiryMs: number, nowMs: number): string => {
  const diff = expiryMs - nowMs;
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  let span: string;
  if (abs < 3_600_000) span = 'פחות משעה';
  else if (hours < 48) span = hours === 1 ? 'שעה' : `${hours} שעות`;
  else span = days === 1 ? 'יום' : `${days} ימים`;
  return diff >= 0 ? `בעוד ${span}` : `לפני ${span}`;
};
