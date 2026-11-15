import { describe, expect, it } from 'vitest';
import { resolveBusinessSettings } from '../../domain/settings';

describe('business settings', () => {
  it('returns explicit safe business-timezone defaults when no document exists', () => {
    expect(resolveBusinessSettings(null)).toEqual({ timezone: 'Asia/Jerusalem', eveningRemindersEnabled: true, morningSummaryEnabled: true, autoEndShiftsAtMidnight: false });
  });
  it('preserves explicit disabled reminders and defaults absent legacy fields', () => {
    expect(resolveBusinessSettings({ eveningRemindersEnabled: false })).toMatchObject({ eveningRemindersEnabled: false, morningSummaryEnabled: true, autoEndShiftsAtMidnight: false });
  });
  it.each([{ timezone: 'UTC' }, { eveningRemindersEnabled: 'false' }, { autoEndShiftsAtMidnight: 1 }])('rejects malformed settings %o', data => {
    expect(() => resolveBusinessSettings(data)).toThrow();
  });
});
