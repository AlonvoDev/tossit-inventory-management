import type { BusinessSettings } from './contracts';
import { invalid } from './errors';

export const DEFAULT_BUSINESS_SETTINGS: Readonly<BusinessSettings> = Object.freeze({
  timezone: 'Asia/Jerusalem', eveningRemindersEnabled: true,
  morningSummaryEnabled: true, autoEndShiftsAtMidnight: false,
});
export function resolveBusinessSettings(data: Record<string, unknown> | null): BusinessSettings {
  if (data?.timezone !== undefined && data.timezone !== 'Asia/Jerusalem') invalid('Unsupported business timezone');
  const result = { ...DEFAULT_BUSINESS_SETTINGS };
  for (const key of ['eveningRemindersEnabled', 'morningSummaryEnabled', 'autoEndShiftsAtMidnight'] as const) {
    if (data?.[key] !== undefined) {
      if (typeof data[key] !== 'boolean') invalid(`Invalid setting: ${key}`);
      result[key] = data[key];
    }
  }
  return result;
}
