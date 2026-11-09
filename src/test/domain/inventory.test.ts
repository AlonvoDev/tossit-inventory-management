import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { buildInventoryItem, buildClosePatch } from '../../domain/inventory';
import { normalizeDepartment, normalizeItem } from '../../domain/normalizeItem';

vi.mock('firebase/firestore', async importOriginal => importOriginal<typeof import('firebase/firestore')>());
const actor = { uid: 'staff', fullName: 'Staff', email: 'staff@example.test', businessId: 'a', role: 'staff' as const, department: 'bar' as const, isOnShift: true };
const product = { id: 'milk', productId: 'P001', name: 'Milk', businessId: 'a', area: 'bar' as const, type: 'kg' as const, shelfLifeDays: 1 };
const input = () => ({ operationId: 'open-test-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 });

describe('inventory domain', () => {
  it.each([[1, 1700086400000], [7, 1700604800000]])('derives expiry from %i catalog days and preserves decimal kg', (days, expected) => {
    const item = buildInventoryItem(actor, { ...product, shelfLifeDays: days }, undefined, input());
    expect(item).toMatchObject({ productId: 'milk', productName: 'Milk', type: 'kg', amount: 0.5, userId: 'staff', businessId: 'a', area: 'bar', finished: false, discarded: false });
    expect(item.expiryTime.toMillis()).toBe(expected);
    expect(item.openingTime.toMillis()).toBe(1700000000000);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid amount %s', amount => {
    expect(() => buildInventoryItem(actor, product, undefined, { ...input(), amount })).toThrow();
  });
  it('rejects fractional units, off-shift staff and foreign catalog/fridge', () => {
    expect(() => buildInventoryItem(actor, { ...product, type: 'units' }, undefined, input())).toThrow();
    expect(() => buildInventoryItem({ ...actor, isOnShift: false }, product, undefined, input())).toThrow();
    expect(() => buildInventoryItem(actor, { ...product, businessId: 'b' }, undefined, input())).toThrow();
    expect(() => buildInventoryItem(actor, product, { id: 'fridge', name: 'Other', businessId: 'b', department: 'bar' }, { ...input(), fridgeId: 'fridge' })).toThrow();
  });
  it('requires a whole shelf life and same-department fridge', () => {
    expect(() => buildInventoryItem(actor, { ...product, shelfLifeDays: 1.5 }, undefined, input())).toThrow();
    expect(() => buildInventoryItem(actor, product, { id: 'fridge', name: 'Kitchen', businessId: 'a', department: 'kitchen' }, { ...input(), fridgeId: 'fridge' })).toThrow();
  });
  it('does not accept an operation ID as a path or a future opening instant', () => {
    expect(() => buildInventoryItem(actor, product, undefined, { ...input(), operationId: 'another/path' })).toThrow();
    expect(() => buildInventoryItem(actor, product, undefined, { ...input(), openedAtMs: Date.now() + 100000 })).toThrow();
  });
  it('rejects conflicting close actions and quantities above the original amount', () => {
    const item = { ...buildInventoryItem(actor, product, undefined, input()), id: 'item-1' };
    expect(() => buildClosePatch(actor, item, { operationId: 'close-test-1', itemId: 'item-1', action: 'discarded', discardedAmount: 1, reason: 'expired' })).toThrow();
    expect(() => buildClosePatch(actor, { ...item, finished: true }, { operationId: 'close-test-2', itemId: 'item-1', action: 'discarded', discardedAmount: 0.5, reason: 'expired' })).toThrow();
  });
  it('records the authoritative actor and distinct final states', () => {
    const item = { ...buildInventoryItem(actor, product, undefined, input()), id: 'item-1' };
    const patch = buildClosePatch(actor, item, { operationId: 'close-test-1', itemId: 'item-1', action: 'discarded', discardedAmount: 0.25, reason: 'damaged' });
    expect(patch).toMatchObject({ discarded: true, isThrown: true, finished: false, discardedQuantity: 0.25, discardReason: 'damaged', discardedBy: 'staff', discardedByName: 'Staff', closedOperationId: 'close-test-1' });
  });
  it('normalizes legacy department and serialized timestamps without losing discard data', () => {
    const item = normalizeItem('legacy', {
      ...buildInventoryItem(actor, product, undefined, input()), area: 'בר',
      openingTime: { seconds: 1700000000, nanoseconds: 0 },
      expiryTime: { seconds: 1700086400, nanoseconds: 0 },
      discardedAt: Timestamp.fromMillis(1700000010000).toJSON(),
      discarded: true, discardedQuantity: 0.25, discardReason: 'damaged',
      finishedAt: Timestamp.fromMillis(1700000010000), finishedBy: 'staff',
    });
    expect(normalizeDepartment('מטבח')).toBe('kitchen');
    expect(normalizeDepartment('other')).toBeNull();
    expect(item.area).toBe('bar');
    expect(item.openingTime.toMillis()).toBe(1700000000000);
    expect(item.discardedAt?.toMillis()).toBe(1700000010000);
    expect(item.discardedQuantity).toBe(0.25);
    expect(item.finishedBy).toBe('staff');
  });
  it('surfaces malformed legacy times instead of inventing expiry', () => {
    expect(() => normalizeItem('bad', { ...product, openingTime: null, expiryTime: 'bad' })).toThrow();
  });
});
