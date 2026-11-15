import { Timestamp } from 'firebase/firestore';
import type { UserProfile } from '../types/UserProfile';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import type { CloseInventoryItemInput, InventoryItem, OpenInventoryItemInput } from './contracts';
import { InventoryError, invalid } from './errors';
import { normalizeDepartment } from './normalizeItem';

function operationId(value: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) invalid('Invalid operation ID');
}
function operates(actor: UserProfile, businessId: string, area: unknown) {
  if (!actor.uid || actor.isActive === false || actor.businessId !== businessId || !normalizeDepartment(area)
      || (actor.role !== 'admin' && actor.department !== normalizeDepartment(area))) {
    throw new InventoryError('permission-denied', 'Inventory is outside the active business or department');
  }
  if (actor.role === 'staff' && actor.isOnShift !== true) throw new InventoryError('not-on-shift', 'Start a shift first');
}
function quantity(amount: number, unit: string) {
  if (!Number.isFinite(amount) || amount <= 0 || !['kg', 'units'].includes(unit) || (unit === 'units' && !Number.isInteger(amount))) invalid('Invalid quantity for product unit');
}
export function buildInventoryItem(actor: UserProfile, product: Product, fridge: Fridge | undefined, input: OpenInventoryItemInput): InventoryItem {
  operationId(input.operationId);
  operates(actor, product.businessId, product.area);
  quantity(input.amount, product.type);
  if (product.id !== input.productId || !product.name.trim() || !Number.isInteger(product.shelfLifeDays) || product.shelfLifeDays <= 0 || product.shelfLifeDays > 3650) invalid('Invalid catalog product');
  if (!Number.isSafeInteger(input.openedAtMs) || input.openedAtMs > Date.now()) invalid('Invalid opening instant');
  if (input.fridgeId && (!fridge || fridge.id !== input.fridgeId || fridge.businessId !== product.businessId || normalizeDepartment(fridge.department) !== normalizeDepartment(product.area))) invalid('Fridge does not belong to the product department');
  let openingTime: Timestamp;
  let expiryTime: Timestamp;
  try {
    openingTime = Timestamp.fromMillis(input.openedAtMs);
    expiryTime = Timestamp.fromMillis(input.openedAtMs + product.shelfLifeDays * 86400000);
  } catch { return invalid('Opening or expiry instant is out of range'); }
  return {
    productId: product.id, productName: product.name, type: product.type, amount: input.amount,
    openingTime, expiryTime, userId: actor.uid, businessId: actor.businessId, area: normalizeDepartment(product.area)!,
    isThrown: false, discarded: false, finished: false,
    ...(input.fridgeId ? { fridgeId: input.fridgeId } : {}),
  };
}
export function buildClosePatch(actor: UserProfile, item: InventoryItem, input: CloseInventoryItemInput): Partial<InventoryItem> {
  operationId(input.operationId);
  operates(actor, item.businessId, item.area);
  if (!item.id || item.id !== input.itemId) invalid('Invalid item identity');
  if (item.finished || item.discarded || item.isThrown) throw new InventoryError('already-closed', 'This batch is already closed');
  if (input.action === 'finished') {
    if (input.discardedAmount !== undefined || input.reason !== undefined) invalid('Finished batches cannot include discard data');
    return { finished: true, discarded: false, isThrown: false, finishedBy: actor.uid, finishedByName: actor.fullName, closedOperationId: input.operationId };
  }
  if (input.action !== 'discarded' || !input.reason || !['expired', 'damaged', 'other'].includes(input.reason)) invalid('Invalid discard action');
  quantity(input.discardedAmount ?? NaN, item.type);
  if (input.discardedAmount! > item.amount) invalid('Discard quantity exceeds batch amount');
  return {
    finished: false, discarded: true, isThrown: true, discardedQuantity: input.discardedAmount,
    discardReason: input.reason, discardedBy: actor.uid, discardedByName: actor.fullName, closedOperationId: input.operationId,
  };
}
