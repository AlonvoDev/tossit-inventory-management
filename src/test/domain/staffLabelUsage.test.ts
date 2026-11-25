import { describe, expect, it } from 'vitest';
import { calculateLastUsableDate, reviewStaffLabelUsage } from '../../domain/staffLabelUsage';

const date = (year: number, month: number, day: number) => ({ year, month, day });

describe('inclusive staff-label calendar days', () => {
  it.each([
    [date(2026, 11, 25), 1, date(2026, 11, 25)],
    [date(2026, 11, 25), 2, date(2026, 11, 26)],
    [date(2026, 11, 25), 3, date(2026, 11, 27)],
    [date(2026, 11, 30), 3, date(2026, 12, 2)],
    [date(2026, 12, 31), 2, date(2027, 1, 1)],
    [date(2028, 2, 28), 3, date(2028, 3, 1)],
    [date(2100, 2, 28), 2, date(2100, 3, 1)],
    [date(2000, 2, 28), 2, date(2000, 2, 29)],
    [date(2026, 3, 26), 3, date(2026, 3, 28)],
    [date(2026, 10, 24), 3, date(2026, 10, 26)],
    [date(1, 12, 31), 2, date(2, 1, 1)],
    [date(99, 12, 31), 2, date(100, 1, 1)],
    [date(9999, 12, 31), 1, date(9999, 12, 31)],
  ])('counts opening day as day one: %j +%s', (opening, days, expected) => {
    expect(calculateLastUsableDate(opening, days)).toEqual(expected);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 3651, '3', '+3', null, undefined, true])(
    'rejects invalid or unreviewed usage-day value %j', days => {
      expect(() => calculateLastUsableDate(date(2026, 11, 25), days)).toThrow();
    },
  );

  it.each([{ month: 11, day: 25 }, date(2026, 2, 29), { ...date(2026, 11, 25), hour: 0 }])(
    'requires a complete valid date without invented year or time: %j', opening => {
      expect(() => calculateLastUsableDate(opening, 3)).toThrow();
    },
  );

  it('rejects out-of-range results rather than silently crossing the supported year boundary', () => {
    expect(() => calculateLastUsableDate(date(9999, 12, 31), 2)).toThrow();
  });

  it('accepts the existing catalog maximum without an off-by-one error', () => {
    expect(calculateLastUsableDate(date(2026, 1, 1), 3650)).toEqual(date(2035, 12, 29));
  });
});

describe('separate staff-label review', () => {
  const decision = () => ({ confirmed: true, openingDate: date(2026, 11, 25), usageDays: 2 });

  it('returns detached date-only evidence with a derived final date', () => {
    const input = decision();
    const reviewed = reviewStaffLabelUsage(input);
    input.openingDate.day = 30;
    expect(reviewed).toEqual({ source: 'staff-label', confirmed: true,
      openingDate: date(2026, 11, 25), usageDays: 2, lastUsableDate: date(2026, 11, 26) });
    expect(reviewed.openingDate).not.toBe(reviewed.lastUsableDate);
  });

  it.each([null, [], { ...decision(), confirmed: false }, { ...decision(), confirmed: 'true' },
    { openingDate: date(2026, 11, 25), usageDays: 2 },
    { ...decision(), lastUsableDate: date(2026, 12, 1) },
    { ...decision(), source: 'packaging' }, { ...decision(), usageDays: '+2' }])(
    'rejects missing confirmation, coercion and caller-supplied derived dates %j', value => {
      expect(() => reviewStaffLabelUsage(value)).toThrow();
    },
  );
});
