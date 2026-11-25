/** Shared scan/review DTOs. These are not inventory writes or trusted expiry instants. */
export type DateEvidenceSource = 'manual' | 'packaging' | 'staff-label';
export type DetectedDateMeaning = 'opened-at' | 'manufacturer-expiry' | 'label-expiry' | 'manufactured-at' | 'unknown';
export type ConfirmableDateMeaning = Exclude<DetectedDateMeaning, 'manufactured-at' | 'unknown'>;
export type DateReviewIssue = 'missing-year' | 'missing-time' | 'ambiguous' | 'unreadable';

/** Day precision intentionally has no implicit midnight, year, timezone or expiry cutoff. */
export interface CalendarDate { year: number; month: number; day: number }
export type DateReading =
  | { precision: 'day'; date: CalendarDate }
  | { precision: 'minute'; date: CalendarDate; hour: number; minute: number; timezone: 'Asia/Jerusalem' };

export interface DateScanCandidate {
  id: string;
  rawText: string;
  meaning: DetectedDateMeaning;
  /** null when the image does not provide an unambiguous complete date. */
  reading: DateReading | null;
  issues: DateReviewIssue[];
}
export interface DateScanResult {
  version: 1;
  source: 'packaging' | 'staff-label';
  outcome: 'candidates' | 'unreadable';
  candidates: DateScanCandidate[];
}

/** A separate UI decision; never manufacture this from a model response. */
export interface ConfirmedDateEvidence {
  source: DateEvidenceSource;
  meaning: ConfirmableDateMeaning;
  reading: DateReading;
  confirmed: true;
}

/** Strict Gregorian components, independent of JS Date normalization or the device timezone. */
export function parseCalendarDate(value: unknown): CalendarDate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid calendar date');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || !['year', 'month', 'day'].every(key => Object.prototype.hasOwnProperty.call(record, key))) {
    throw new Error('Calendar date requires year, month and day only');
  }
  const { year, month, day } = record;
  if (typeof year !== 'number' || typeof month !== 'number' || typeof day !== 'number'
      || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)
      || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) throw new Error('Invalid calendar date');
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > days[month - 1]) throw new Error('Invalid day for calendar month');
  return { year, month, day };
}

/** Components only: resolving a local minute across DST still needs the approved policy. */
export function parseDateReading(value: unknown): DateReading {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid date reading');
  const record = value as Record<string, unknown>;
  const date = parseCalendarDate(record.date);
  if (record.precision === 'day' && Object.keys(record).length === 2) return { precision: 'day', date };
  if (record.precision !== 'minute' || Object.keys(record).length !== 5
      || record.timezone !== 'Asia/Jerusalem'
      || typeof record.hour !== 'number' || !Number.isInteger(record.hour) || record.hour < 0 || record.hour > 23
      || typeof record.minute !== 'number' || !Number.isInteger(record.minute) || record.minute < 0 || record.minute > 59) {
    throw new Error('Invalid date reading precision, time or timezone');
  }
  return { precision: 'minute', date, hour: record.hour, minute: record.minute, timezone: 'Asia/Jerusalem' };
}
