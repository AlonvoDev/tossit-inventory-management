// Run in the business timezone: UTC parsing of "YYYY-MM-DD" shifts days here, UTC hides it.
const originalTZ = process.env.TZ;
process.env.TZ = 'Asia/Jerusalem';

import { afterAll, describe, it, expect } from 'vitest';
import {
  endOfDay,
  fromDateInputValue,
  isValidRange,
  presetRange,
  startOfDay,
  toDateInputValue,
  toQueryBounds,
} from './dateRange';

describe('dateRange helpers', () => {
  it('round-trips date input values as local calendar days', () => {
    const d = fromDateInputValue('2026-03-27');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(27);
    expect(d!.getHours()).toBe(0);
    expect(toDateInputValue(d)).toBe('2026-03-27');
  });

  it('formats late-evening local times as the same local day (no UTC shift)', () => {
    expect(toDateInputValue(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
    expect(toDateInputValue(new Date(2026, 10, 9, 0, 30))).toBe('2026-11-09');
  });

  it('rejects empty, malformed and rolled-over dates', () => {
    expect(fromDateInputValue('')).toBeNull();
    expect(fromDateInputValue('2026-2-1')).toBeNull();
    expect(fromDateInputValue('2026-02-31')).toBeNull();
  });

  it('today preset covers the whole current day, not only from now', () => {
    const now = new Date(2026, 10, 9, 15, 45);
    const { start, end } = presetRange('today', now);
    const bounds = toQueryBounds(start, end);
    expect(bounds.start).toEqual(new Date(2026, 10, 9, 0, 0, 0, 0));
    expect(bounds.end).toEqual(new Date(2026, 10, 9, 23, 59, 59, 999));
    // A discard at 08:00 today is inside the range.
    const morning = new Date(2026, 10, 9, 8, 0);
    expect(morning >= bounds.start! && morning <= bounds.end!).toBe(true);
  });

  it('week preset starts at midnight seven days ago', () => {
    const { start } = presetRange('week', new Date(2026, 10, 9, 15, 45));
    expect(start).toEqual(new Date(2026, 10, 2, 0, 0, 0, 0));
  });

  it('open-ended bounds stay undefined', () => {
    expect(toQueryBounds(null, null)).toEqual({ start: undefined, end: undefined });
  });

  it('validates range order by day', () => {
    const a = new Date(2026, 10, 9, 22);
    const b = new Date(2026, 10, 9, 1);
    expect(isValidRange(a, b)).toBe(true); // same day
    expect(isValidRange(new Date(2026, 10, 10), b)).toBe(false);
    expect(isValidRange(null, b)).toBe(true);
    expect(startOfDay(a) <= endOfDay(b)).toBe(true);
  });
});

afterAll(() => {
  process.env.TZ = originalTZ;
});
