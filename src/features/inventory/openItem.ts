import type { ItemUnit } from '../../domain/contracts';

/**
 * Opening-form rules (U2). Presentation checks matching the C2 contract: kg amounts are positive
 * finite decimals, units are positive integers. The server re-validates; nothing here is trusted.
 */
export const MAX_KG = 1000;
export const MAX_UNITS = 10000;

/** "0.5", "0,5", "2" → number; rejects empty, zero, negative, NaN, exponent and over-precise input. */
export const parseAmount = (raw: string, unit: ItemUnit): number | null => {
  const text = raw.trim().replace(',', '.');
  if (unit === 'units') {
    if (!/^\d+$/.test(text)) return null;
    const n = Number(text);
    return Number.isSafeInteger(n) && n >= 1 && n <= MAX_UNITS ? n : null;
  }
  if (!/^\d+(\.\d{1,3})?$/.test(text) && !/^\.\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= MAX_KG ? n : null;
};

export const amountError = (unit: ItemUnit): string =>
  unit === 'kg'
    ? `יש להזין משקל חיובי בק"ג (עד 3 ספרות אחרי הנקודה, עד ${MAX_KG})`
    : `יש להזין מספר שלם של יחידות (1–${MAX_UNITS})`;

export const unitLabel = (unit: ItemUnit | undefined): string => (unit === 'kg' ? 'ק"ג' : 'יחידות');

/** Staff need an active shift to open items; admins and managers do not (C1b rules). */
export const shiftBlocksOpening = (role: unknown, isOnShift: boolean): boolean => role === 'staff' && !isOnShift;

/**
 * One operation ID and opening instant per user intent. Retrying the same payload reuses them,
 * so a lost acknowledgement cannot create a second batch; any change to the payload starts a
 * new intent. `complete` ends the intent after a receipt.
 */
export interface Intent {
  key: string;
  operationId: string;
  openedAtMs: number;
}

export const nextIntent = (current: Intent | null, key: string, now: () => number, uuid: () => string): Intent =>
  current && current.key === key ? current : { key, operationId: uuid(), openedAtMs: now() };
