import { describe, it, expect } from 'vitest';
import { displayStatus, formatQuantity, relativeExpiry } from './inventoryDisplay';

const NOW = 1_800_000_000_000;
const H = 3_600_000;
const item = (exp: number, extra: Record<string, boolean> = {}) => ({ area: 'bar', expiryTime: { toMillis: () => exp }, ...extra });

describe('inventory display', () => {
  it('derives status from the existing selector boundaries', () => {
    expect(displayStatus(item(NOW - 1), NOW)).toBe('expired');
    expect(displayStatus(item(NOW), NOW)).toBe('expired'); // expiry <= now
    expect(displayStatus(item(NOW + 10 * H), NOW)).toBe('expiring');
    expect(displayStatus(item(NOW + 72 * H), NOW)).toBe('expiring'); // 3 x 24h inclusive
    expect(displayStatus(item(NOW + 73 * H), NOW)).toBe('ok');
    expect(displayStatus(item(NOW - 1, { finished: true }), NOW)).toBe('finished');
    expect(displayStatus(item(NOW - 1, { discarded: true, isThrown: true }), NOW)).toBe('discarded');
  });

  it('formats quantities and relative expiry in Hebrew', () => {
    expect(formatQuantity(0.5, 'kg')).toBe('0.5 ק״ג');
    expect(formatQuantity(6, 'units')).toBe('6 יח׳');
    expect(relativeExpiry(NOW + 10 * H, NOW)).toBe('בעוד 10 שעות');
    expect(relativeExpiry(NOW + 30 * 60_000, NOW)).toBe('בעוד פחות משעה');
    expect(relativeExpiry(NOW - 3 * 24 * H, NOW)).toBe('לפני 3 ימים');
    expect(relativeExpiry(NOW + 1 * H, NOW)).toBe('בעוד שעה');
  });
});
