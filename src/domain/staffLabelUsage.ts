import { parseCalendarDate, type CalendarDate } from './dateEvidence';

/** A separate, explicitly reviewed staff-label draft; never an inventory write. */
export interface ReviewedStaffLabelUsage {
  source: 'staff-label';
  confirmed: true;
  openingDate: CalendarDate;
  usageDays: number;
  lastUsableDate: CalendarDate;
}

/** Same input bound as the inventory catalog. No coercion of OCR text such as "+3". */
function parseUsageDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('Usage days must be an integer between 1 and 3650');
  }
  return value;
}

/** Calendar arithmetic only. This deliberately creates no timezone or expiry instant. */
export function calculateLastUsableDate(openingDate: unknown, usageDays: unknown): CalendarDate {
  const date = parseCalendarDate(openingDate);
  const count = parseUsageDays(usageDays);
  // setUTCFullYear preserves years 1–99 (Date.UTC would reinterpret them as 1901–1999).
  // UTC is only a Gregorian calendar carrier; no opening timestamp is converted here.
  const calendar = new Date(0);
  calendar.setUTCFullYear(date.year, date.month - 1, date.day);
  calendar.setUTCDate(calendar.getUTCDate() + count - 1);
  return parseCalendarDate({
    year: calendar.getUTCFullYear(), month: calendar.getUTCMonth() + 1, day: calendar.getUTCDate(),
  });
}

/**
 * Call only for the separate user review action, never directly on provider JSON.
 * Output remains a draft: authentication and trusted persistence are separate concerns.
 */
export function reviewStaffLabelUsage(decision: unknown): ReviewedStaffLabelUsage {
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw new Error('Explicit staff-label review required');
  }
  const record = decision as Record<string, unknown>;
  const keys = ['confirmed', 'openingDate', 'usageDays'];
  if (Object.keys(record).length !== keys.length
      || !keys.every(key => Object.prototype.hasOwnProperty.call(record, key))
      || record.confirmed !== true) throw new Error('Explicit staff-label review required');
  const openingDate = parseCalendarDate(record.openingDate);
  const usageDays = parseUsageDays(record.usageDays);
  return {
    source: 'staff-label', confirmed: true, openingDate, usageDays,
    lastUsableDate: calculateLastUsableDate(openingDate, usageDays),
  };
}
