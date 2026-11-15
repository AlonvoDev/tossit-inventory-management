import { describe, it, expect } from 'vitest';
import { selectItems, EXPIRING_WINDOW_MS } from './itemSelection';
import { validateClose } from './closeItem';

const NOW = 1_800_000_000_000;
const ts = (ms: number) => ({ toMillis: () => ms });
const item = (over: Partial<{ id: string; area: unknown; exp: number; discarded: boolean; isThrown: boolean; finished: boolean }>) => ({
  id: over.id ?? 'x',
  area: over.area ?? 'bar',
  expiryTime: ts(over.exp ?? NOW + 10 * EXPIRING_WINDOW_MS),
  discarded: over.discarded ?? false,
  isThrown: over.isThrown ?? false,
  finished: over.finished ?? false,
});

describe('selectItems', () => {
  const items = [
    item({ id: 'bar-canonical', area: 'bar' }),
    item({ id: 'bar-legacy', area: 'בר' }),
    item({ id: 'kitchen', area: 'kitchen' }),
    item({ id: 'expiring', area: 'bar', exp: NOW + 60_000 }),
    item({ id: 'expired', area: 'bar', exp: NOW - 60_000 }),
    item({ id: 'finished', area: 'bar', finished: true }),
    item({ id: 'discarded', area: 'bar', discarded: true, isThrown: true, exp: NOW - 1 }),
    item({ id: 'unknown-area', area: 'warehouse' }),
  ];
  const ids = (mode: Parameters<typeof selectItems>[1]['mode'], department?: unknown) =>
    selectItems(items, { mode, department }, NOW).map(i => i.id).sort();

  it('matches canonical and legacy Hebrew departments (C2 returns canonical values)', () => {
    expect(ids('active', 'bar')).toEqual(['bar-canonical', 'bar-legacy', 'expiring'].sort());
    expect(ids('active', 'בר')).toEqual(ids('active', 'bar'));
    expect(ids('active', 'kitchen')).toEqual(['kitchen']);
  });

  it('separates open, expiring, expired-and-open, discarded and finished', () => {
    expect(ids('open', 'bar')).toEqual(['bar-canonical', 'bar-legacy', 'expired', 'expiring'].sort());
    expect(ids('expiring', 'bar')).toEqual(['expiring']);
    expect(ids('expired', 'bar')).toEqual(['expired']);
    expect(ids('discarded')).toEqual(['discarded']);
    expect(ids('finished')).toEqual(['finished']);
  });

  it('without a department filter nothing is hidden (server already scopes)', () => {
    expect(ids('open')).toContain('unknown-area');
  });

  it('sorts by soonest expiry', () => {
    expect(selectItems(items, { mode: 'open', department: 'bar' }, NOW)[0].id).toBe('expired');
  });
});

describe('validateClose', () => {
  it('finished needs no amount or reason', () => {
    expect(validateClose({ action: 'finished', amountRaw: '', reason: '' }, 'kg', 1)).toEqual({ ok: true });
  });

  it('discarded needs a valid amount within the batch and a reason', () => {
    expect(validateClose({ action: 'discarded', amountRaw: '0.4', reason: 'expired' }, 'kg', 0.5)).toEqual({
      ok: true,
      discardedAmount: 0.4,
      reason: 'expired',
    });
    expect(validateClose({ action: 'discarded', amountRaw: '0.6', reason: 'expired' }, 'kg', 0.5)).toMatchObject({ ok: false, field: 'amount' });
    expect(validateClose({ action: 'discarded', amountRaw: '1.5', reason: 'damaged' }, 'units', 3)).toMatchObject({ ok: false, field: 'amount' });
    expect(validateClose({ action: 'discarded', amountRaw: '2', reason: '' }, 'units', 3)).toMatchObject({ ok: false, field: 'reason' });
  });
});
