import { Timestamp } from 'firebase/firestore';
import type { Department, InventoryItem } from './contracts';
import { invalid } from './errors';

export function normalizeDepartment(value: unknown): Department | null {
  return value === 'bar' || value === 'בר' ? 'bar' : value === 'kitchen' || value === 'מטבח' ? 'kitchen' : null;
}
export function departmentValues(value: Department): [Department, string] {
  return [value, value === 'bar' ? 'בר' : 'מטבח'];
}
function timestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value
      && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) {
    try { return new Timestamp(value.seconds as number, value.nanoseconds as number); } catch { return invalid('Invalid timestamp'); }
  }
  // Old JSON caches can contain ISO strings, but never invent an opening/expiry time.
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value))) return Timestamp.fromMillis(Date.parse(value));
  return invalid('Invalid inventory timestamp');
}
export function normalizeItem(id: string, data: Record<string, unknown>): InventoryItem {
  const area = normalizeDepartment(data.area);
  if (!area || !['kg', 'units'].includes(String(data.type)) || typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount <= 0) invalid('Invalid inventory item');
  for (const key of ['productName', 'userId', 'businessId'] as const) {
    if (typeof data[key] !== 'string' || !data[key].trim()) invalid(`Invalid inventory ${key}`);
  }
  const item: InventoryItem = {
    id, productName: data.productName as string, userId: data.userId as string,
    businessId: data.businessId as string, type: data.type as InventoryItem['type'], amount: data.amount as number,
    area, openingTime: timestamp(data.openingTime), expiryTime: timestamp(data.expiryTime),
    isThrown: data.isThrown === true || data.discarded === true,
    discarded: data.discarded === true || data.isThrown === true, finished: data.finished === true,
  };
  for (const key of ['productId', 'fridgeId', 'discardedBy', 'discardedByName', 'finishedBy', 'finishedByName', 'closedOperationId'] as const) {
    if (typeof data[key] === 'string') item[key] = data[key];
  }
  for (const key of ['discardedAt', 'finishedAt'] as const) {
    if (data[key] !== undefined && data[key] !== null) item[key] = timestamp(data[key]);
  }
  if (data.discardedQuantity !== undefined) {
    if (typeof data.discardedQuantity !== 'number' || !Number.isFinite(data.discardedQuantity) || data.discardedQuantity < 0 || data.discardedQuantity > item.amount) invalid('Invalid discarded quantity');
    item.discardedQuantity = data.discardedQuantity;
  }
  if (data.discardReason !== undefined) {
    if (!['expired', 'damaged', 'other'].includes(String(data.discardReason))) invalid('Invalid discard reason');
    item.discardReason = data.discardReason as InventoryItem['discardReason'];
  }
  for (const key of ['reminderSent', 'adminNotified'] as const) if (typeof data[key] === 'boolean') item[key] = data[key];
  return item;
}
