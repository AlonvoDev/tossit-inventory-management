import { describe, expect, it } from 'vitest';
import { parseCalendarDate, parseDateReading } from '../../domain/dateEvidence';

describe('explicit date evidence components', () => {
  it.each([
    { year: 2028, month: 2, day: 29 },
    { year: 2000, month: 2, day: 29 },
    { year: 2026, month: 11, day: 25 },
  ])('preserves an explicit valid date %j without choosing an instant', date => {
    expect(parseCalendarDate(date)).toEqual(date);
    expect(parseDateReading({ precision: 'day', date })).toEqual({ precision: 'day', date });
  });

  it.each([
    { year: 2026, month: 2, day: 29 },
    { year: 1900, month: 2, day: 29 },
    { year: 2026, month: 4, day: 31 },
    { year: 2026, month: 13, day: 1 },
    { year: 2026, month: 0, day: 1 },
    { year: 2026, month: 1, day: 0 },
    { year: 2026, month: 1, day: 1.5 },
    { year: NaN, month: 1, day: 1 },
    { year: '2026', month: 1, day: 1 },
    { month: 11, day: 25 },
    { year: 2026, month: 11, day: 25, expiresAtMs: 1 },
    null, [], '25/11/26',
  ])('rejects incomplete, impossible or coerced input %j', date => {
    expect(() => parseCalendarDate(date)).toThrow();
  });

  it('copies accepted data so later raw-input mutation cannot change the reading', () => {
    const raw = { year: 2026, month: 11, day: 25 };
    const result = parseDateReading({ precision: 'day', date: raw });
    raw.day = 26;
    expect(result.date.day).toBe(25);
  });

  it('preserves the written minute and timezone without converting it to an instant', () => {
    const reading = { precision: 'minute', date: { year: 2026, month: 11, day: 25 }, hour: 23, minute: 33, timezone: 'Asia/Jerusalem' };
    expect(parseDateReading(reading)).toEqual(reading);
  });

  it.each([
    { precision: 'minute', hour: 24, minute: 0, timezone: 'Asia/Jerusalem' },
    { precision: 'minute', hour: 23, minute: 60, timezone: 'Asia/Jerusalem' },
    { precision: 'minute', hour: 23.5, minute: 0, timezone: 'Asia/Jerusalem' },
    { precision: 'minute', hour: 23, minute: 0, timezone: 'UTC' },
    { precision: 'minute', hour: 23, timezone: 'Asia/Jerusalem' },
    { precision: 'day', hour: 0 },
    { precision: 'day', confirmed: true },
    { precision: 'unknown' },
  ])('rejects a mixed precision or silent timezone assumption %j', extra => {
    expect(() => parseDateReading({ date: { year: 2026, month: 11, day: 25 }, ...extra })).toThrow();
  });
});
