import { describe, it, expect } from 'vitest';
import { nextIntent, parseAmount, shiftBlocksOpening } from './openItem';
import { operableDepartments } from '../../app/access';

describe('parseAmount', () => {
  it('accepts decimal kilograms, including comma input', () => {
    expect(parseAmount('0.5', 'kg')).toBe(0.5);
    expect(parseAmount('0,25', 'kg')).toBe(0.25);
    expect(parseAmount('.5', 'kg')).toBe(0.5);
    expect(parseAmount('2', 'kg')).toBe(2);
  });

  it.each(['0', '-1', '', 'abc', '1e2', 'NaN', 'Infinity', '0.0001', '1001'])('rejects kg "%s"', raw => {
    expect(parseAmount(raw, 'kg')).toBeNull();
  });

  it('accepts only positive whole units', () => {
    expect(parseAmount('3', 'units')).toBe(3);
    for (const raw of ['0.5', '1.0', '0', '-2', '', '1e1', '10001']) expect(parseAmount(raw, 'units')).toBeNull();
  });
});

describe('opening rules', () => {
  it('blocks only off-shift staff', () => {
    expect(shiftBlocksOpening('staff', false)).toBe(true);
    expect(shiftBlocksOpening('staff', true)).toBe(false);
    expect(shiftBlocksOpening('manager', false)).toBe(false);
    expect(shiftBlocksOpening('admin', false)).toBe(false);
  });

  it('scopes operable departments by role', () => {
    expect(operableDepartments('admin', 'bar')).toEqual(['bar', 'kitchen']);
    expect(operableDepartments('staff', 'מטבח')).toEqual(['kitchen']);
    expect(operableDepartments('manager', 'bar')).toEqual(['bar']);
    expect(operableDepartments('staff', undefined)).toEqual([]);
  });

  it('reuses an intent for the same payload and renews it for a different one', () => {
    let n = 0;
    const uuid = () => `op-${++n}-xxxxxxxx`;
    const a = nextIntent(null, 'k1', () => 1000, uuid);
    expect(nextIntent(a, 'k1', () => 9999, uuid)).toBe(a);
    const b = nextIntent(a, 'k2', () => 2000, uuid);
    expect(b.operationId).not.toBe(a.operationId);
    expect(b.openedAtMs).toBe(2000);
  });
});
