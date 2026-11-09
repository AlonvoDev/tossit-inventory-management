import { doc, getDocFromServer, onSnapshot, type Query } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { DiscardReason, InventoryItem } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';
import { normalizeDepartment, normalizeItem } from '../domain/normalizeItem';
import { assertCurrentActor, getCurrentActor, getInventoryActor, readScopedCollection, scopedBusinessQuery } from './access';
import { openInventoryItem, closeInventoryItem } from './inventoryOperations';
import { getOfflineActor, inventoryController, projectInventory } from '../offline/runtime';
import { offlineStore } from '../offline/storage';
export { getBusinessProducts } from './productsAPI';
// Retained for UI compatibility; canonical shared read model lives in contracts.
export type Item = Omit<InventoryItem, 'area'> & { area: string };

export async function getUserProfile(userId: string) {
  const actor = await getCurrentActor();
  if (userId !== actor.uid && actor.role !== 'admin') throw new InventoryError('permission-denied', 'Profile is outside your scope');
  const snapshot = await getDocFromServer(doc(db, 'users', userId));
  assertCurrentActor(actor);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Profile not found');
  return snapshot.data();
}
export async function addItem(productId: string, _productName: string, amount: number, area: string, businessId: string, userId: string, fridgeId?: string): Promise<string> {
  const actor = await getInventoryActor();
  if (actor.businessId !== businessId || actor.uid !== userId || !normalizeDepartment(area)
      || (actor.role !== 'admin' && normalizeDepartment(area) !== actor.department)) throw new InventoryError('permission-denied', 'Opening belongs to a stale or unauthorized session');
  return (await openInventoryItem({ operationId: crypto.randomUUID(), productId, amount, openedAtMs: Date.now(), ...(fridgeId ? { fridgeId } : {}) })).itemId;
}
export async function addItemOriginal(item: Omit<Item, 'id'>): Promise<string> {
  if (!item.productId) invalid('A catalog product ID is required');
  const actor = await getInventoryActor();
  if (actor.uid !== item.userId || actor.businessId !== item.businessId) throw new InventoryError('permission-denied', 'Opening belongs to a stale session');
  return (await openInventoryItem({ operationId: crypto.randomUUID(), productId: item.productId, amount: item.amount, openedAtMs: item.openingTime.toMillis(), ...(item.fridgeId ? { fridgeId: item.fridgeId } : {}) })).itemId;
}
export async function updateItem(id: string, data: Partial<Item>): Promise<void> { void id; void data; throw new InventoryError('permission-denied', 'Use an audited inventory close action'); }
export async function deleteItem(id: string): Promise<void> { void id; throw new InventoryError('permission-denied', 'Inventory audit records cannot be deleted'); }
async function verifyLegacyActor(uid: string) {
  const actor = await getInventoryActor();
  if (actor.uid !== uid) throw new InventoryError('permission-denied', 'Close action belongs to a stale session');
  return actor;
}
export async function markItemAsDiscarded(itemId: string, discardedBy: string, _discardedByName: string, discardedQuantity?: number, discardReason: DiscardReason = 'other'): Promise<void> {
  const actor = await verifyLegacyActor(discardedBy);
  const item = discardedQuantity === undefined ? (await getBusinessItems(actor.businessId)).find(item => item.id === itemId) : undefined;
  if (discardedQuantity === undefined && !item) throw new InventoryError('not-found', 'Batch not found');
  assertCurrentActor(actor);
  await closeInventoryItem({ operationId: crypto.randomUUID(), itemId, action: 'discarded', discardedAmount: discardedQuantity ?? item!.amount, reason: discardReason });
}
export async function markItemAsThrown(id: string): Promise<void> {
  const actor = await getInventoryActor();
  return markItemAsDiscarded(id, actor.uid, actor.fullName);
}
export async function markItemAsFinished(itemId: string, finishedBy: string, _finishedByName: string): Promise<void> {
  void _finishedByName;
  const actor = await verifyLegacyActor(finishedBy);
  assertCurrentActor(actor);
  await closeInventoryItem({ operationId: crypto.randomUUID(), itemId, action: 'finished' });
}
export async function getBusinessItems(businessId: string): Promise<Item[]> {
  const { actor, records } = await readScopedCollection('items', 'area', businessId);
  return projectInventory(records.map(record => normalizeItem(record.id as string, record)), actor);
}
export async function getAreaItems(businessId: string, area: string): Promise<Item[]> {
  const department = normalizeDepartment(area);
  if (!department) invalid('Unknown department');
  return (await getBusinessItems(businessId)).filter(item => item.area === department);
}
export async function getExpiredItems(businessId: string): Promise<Item[]> {
  const now = Date.now();
  return (await getBusinessItems(businessId)).filter(item => !item.finished && !item.discarded && !item.isThrown && item.expiryTime.toMillis() <= now);
}
export const getExpiredNotDiscardedItems = getExpiredItems;
function auditOrder(field: 'discardedAt' | 'finishedAt') {
  return (a: Item, b: Item) => (b[field]?.toMillis() ?? 0) - (a[field]?.toMillis() ?? 0);
}
export async function getDiscardedItems(businessId: string): Promise<Item[]> {
  return (await getBusinessItems(businessId)).filter(item => item.discarded || item.isThrown).sort(auditOrder('discardedAt'));
}
export async function getFinishedItems(businessId: string): Promise<Item[]> {
  return (await getBusinessItems(businessId)).filter(item => item.finished).sort(auditOrder('finishedAt'));
}
export async function getDiscardedItemsWithDateFilter(businessId: string, startDate?: Date, endDate?: Date, reason?: DiscardReason): Promise<Item[]> {
  if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime())) || (startDate && endDate && startDate > endDate)) invalid('Invalid report date range');
  if (reason !== undefined && !['expired', 'damaged', 'other'].includes(reason)) invalid('Invalid report reason');
  return (await getDiscardedItems(businessId)).filter(item => {
    if (reason && (item.discardReason ?? 'other') !== reason) return false;
    if (!startDate && !endDate) return true; // Undated legacy records remain in unbounded history.
    const instant = item.discardedAt?.toMillis();
    return instant !== undefined && (!startDate || instant >= startDate.getTime()) && (!endDate || instant <= endDate.getTime());
  });
}
export interface DiscardReportItem {
  productName: string; totalQuantity: number; discardCount: number;
  reasons: Record<DiscardReason, number>; averageQuantity: number; lastDiscarded?: Date; type: 'kg' | 'units';
}
export async function getDiscardReport(businessId: string, startDate?: Date, endDate?: Date, reason?: DiscardReason): Promise<DiscardReportItem[]> {
  const groups = new Map<string, DiscardReportItem>();
  for (const item of await getDiscardedItemsWithDateFilter(businessId, startDate, endDate, reason)) {
    const key = JSON.stringify([item.productId ?? item.productName, item.type]);
    const report = groups.get(key) ?? { productName: item.productName, type: item.type, totalQuantity: 0, discardCount: 0, reasons: { expired: 0, damaged: 0, other: 0 }, averageQuantity: 0 };
    report.totalQuantity += item.discardedQuantity ?? item.amount;
    report.discardCount++;
    report.reasons[item.discardReason ?? 'other']++;
    const date = item.discardedAt?.toDate();
    if (date && (!report.lastDiscarded || date > report.lastDiscarded)) report.lastDiscarded = date;
    report.averageQuantity = report.totalQuantity / report.discardCount;
    groups.set(key, report);
  }
  return [...groups.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
}
/** Actor-scoped listener; a disposed or changed session cannot receive late data. */
export function subscribeBusinessItems(businessId: string, listener: (items: Item[]) => void, onError: (error: unknown) => void): () => void {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  let base: InventoryItem[] | undefined;
  let actor: Awaited<ReturnType<typeof getInventoryActor>> | undefined;
  let boundSignature: string | undefined;
  let version = 0;
  const uid = auth.currentUser?.uid;
  const valid = () => !disposed && !!uid && auth.currentUser?.uid === uid;
  const signature = (profile: NonNullable<typeof actor>) => JSON.stringify([profile.uid, profile.businessId, profile.role, profile.department]);
  const publish = async () => {
    const turn = ++version;
    try {
      const fresh = await getInventoryActor();
      if (!valid() || turn !== version) return;
      if (fresh.businessId !== businessId) throw new InventoryError('permission-denied', 'Business changed');
      actor = fresh;
      if (base === undefined) {
        const cached = await offlineStore.getCache<Record<string, unknown>[]>(fresh, 'items');
        if (!valid() || turn !== version) return;
        if (cached) base = cached.map(record => normalizeItem(record.id as string, record));
      }
      const nextSignature = signature(fresh);
      if (boundSignature !== nextSignature) {
        unsubscribe?.(); unsubscribe = undefined; boundSignature = nextSignature;
        const inventoryQuery: Query = await scopedBusinessQuery('items', 'area', businessId);
        if (!valid() || boundSignature !== nextSignature) return;
        unsubscribe = onSnapshot(inventoryQuery, { includeMetadataChanges: true }, snapshot => {
          if (!valid() || boundSignature !== nextSignature || snapshot.metadata.fromCache) return;
          try {
            base = snapshot.docs.map(snapshot => normalizeItem(snapshot.id, snapshot.data()));
            void offlineStore.putCache(fresh, 'items', base).catch(() => undefined);
            void publish();
          } catch (error) { onError(error); }
        }, error => { if (valid() && boundSignature === nextSignature) { base = undefined; listener([]); onError(error); } });
      }
      if (base && valid() && turn === version) {
        const projected = await projectInventory(base, fresh);
        if (valid() && turn === version) listener(projected);
      }
    } catch (error) { if (valid() && turn === version) { listener([]); onError(error); } }
  };
  const stopQueue = inventoryController.subscribe(() => {
    if (!valid()) {
      if (!disposed && actor) { unsubscribe?.(); unsubscribe = undefined; boundSignature = undefined; version++; listener([]); }
      return;
    }
    const authority = getOfflineActor();
    if (actor && (!authority || signature(authority) !== signature(actor))) {
      unsubscribe?.(); unsubscribe = undefined; boundSignature = undefined; version++;
      listener([]); // Immediately revoke a previous account/privilege snapshot.
    }
    void publish();
  });
  return () => { disposed = true; version++; stopQueue(); unsubscribe?.(); };
}
