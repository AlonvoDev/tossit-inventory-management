/**
 * Calendar-day helpers for report date filters.
 *
 * Report filters are whole local calendar days: a range starts at 00:00:00.000 of its
 * first day and ends at 23:59:59.999 of its last day. Values typed into <input type="date">
 * ("YYYY-MM-DD") are local dates; `new Date("YYYY-MM-DD")` would parse them as UTC midnight
 * and shift the day in non-UTC timezones, so never use it here.
 */

export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date → "YYYY-MM-DD" for <input type="date">. */
export const toDateInputValue = (date: Date | null | undefined): string =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : '';

/** "YYYY-MM-DD" → local start of that day; invalid or empty input → null. */
export const fromDateInputValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Reject rollovers such as 2026-02-31.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

export const isValidRange = (start: Date | null, end: Date | null): boolean =>
  !start || !end || startOfDay(start).getTime() <= startOfDay(end).getTime();

export type PresetId = 'today' | 'week' | 'month' | '3months' | '6months' | 'year';

/** Preset ranges as whole days, ending today. */
export const presetRange = (id: PresetId, now: Date = new Date()): { start: Date; end: Date } => {
  const start = startOfDay(now);
  switch (id) {
    case 'today':
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { start, end: startOfDay(now) };
};

/** Query bounds for the report API: inclusive whole days, or undefined for an open side. */
export const toQueryBounds = (start: Date | null, end: Date | null) => ({
  start: start ? startOfDay(start) : undefined,
  end: end ? endOfDay(end) : undefined,
});
