import { doc, getDocFromServer, runTransaction, serverTimestamp, setDoc, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import type { CloseInventoryItemInput, InventoryItem, OpenInventoryItemInput, SyncOperation, WriteReceipt } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';
import { buildClosePatch, buildInventoryItem } from '../domain/inventory';
import { normalizeItem } from '../domain/normalizeItem';
import { assertCurrentActor, getCurrentActor } from './access';

function online() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new InventoryError('unavailable', 'Offline writes are not available until the durable queue is connected');
}
function validId(value: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) invalid('Invalid operation ID');
}
function receipt(operationId: string, itemId: string): WriteReceipt { return { operationId, itemId, state: 'synced' }; }
function repeatedClose(item: InventoryItem, input: CloseInventoryItemInput, uid: string): boolean {
  if (item.closedOperationId !== input.operationId) return false;
  const same = input.action === 'finished'
    ? item.finished && item.finishedBy === uid && input.discardedAmount === undefined && input.reason === undefined
    : input.action === 'discarded' && item.discarded && item.discardedBy === uid && item.discardedQuantity === input.discardedAmount && item.discardReason === input.reason;
  if (!same) invalid('Operation ID was already used for another close action');
  return true;
}
export async function openInventoryItem(input: OpenInventoryItemInput): Promise<WriteReceipt> {
  online(); validId(input.operationId);
  const actor = await getCurrentActor();
  const ref = doc(db, 'items', input.operationId);
  const priorReceipt = (snapshot: DocumentSnapshot<DocumentData>): WriteReceipt | undefined => {
    assertCurrentActor(actor);
    if (!snapshot.exists()) return;
    const prior = normalizeItem(snapshot.id, snapshot.data());
    if (prior.userId !== actor.uid || prior.businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Operation ID belongs to another employee');
    if (prior.productId !== input.productId || prior.amount !== input.amount
        || prior.openingTime.toMillis() !== input.openedAtMs || prior.fridgeId !== input.fridgeId) invalid('Operation ID was already used for another opening');
    return receipt(input.operationId, ref.id);
  };
  // Read an acknowledged prior intent before consulting the current catalog.
  // Missing documents can be denied by scoped rules; only that case proceeds.
  let previous;
  try { previous = await getDocFromServer(ref); } catch (error) {
    if ((error as { code?: string }).code !== 'permission-denied') throw error;
  }
  if (previous) {
    const acknowledged = priorReceipt(previous);
    if (acknowledged) return acknowledged;
  }
  assertCurrentActor(actor);
  const productSnapshot = await getDocFromServer(doc(db, 'products', input.productId));
  if (!productSnapshot.exists()) throw new InventoryError('not-found', 'Product no longer exists');
  const product = { ...productSnapshot.data(), id: productSnapshot.id } as Product;
  let fridge: Fridge | undefined;
  if (input.fridgeId) {
    const snapshot = await getDocFromServer(doc(db, 'fridges', input.fridgeId));
    if (!snapshot.exists()) throw new InventoryError('not-found', 'Fridge no longer exists');
    fridge = { ...snapshot.data(), id: snapshot.id } as Fridge;
  }
  assertCurrentActor(actor);
  const item = buildInventoryItem(actor, product, fridge, input);
  try {
    // The stable operation ID is the document ID. Rules allow creation once,
    // so concurrent/retried requests cannot create duplicate batches.
    await setDoc(ref, item);
  } catch (error) {
    // Lost acknowledgement or an identical retry may encounter an existing batch.
    // A denied/missing read must preserve the original failure, never fake success.
    let existing;
    try { existing = await getDocFromServer(ref); } catch { throw error; }
    const acknowledged = priorReceipt(existing);
    if (!acknowledged) throw error;
    return acknowledged;
  }
  assertCurrentActor(actor);
  return receipt(input.operationId, ref.id);
}
export async function closeInventoryItem(input: CloseInventoryItemInput): Promise<WriteReceipt> {
  online(); validId(input.operationId);
  if (!input.itemId || input.itemId.includes('/')) invalid('Invalid item ID');
  const actor = await getCurrentActor();
  const ref = doc(db, 'items', input.itemId);
  try { await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    assertCurrentActor(actor);
    if (!snapshot.exists()) throw new InventoryError('not-found', 'Inventory batch no longer exists');
    const item = normalizeItem(snapshot.id, snapshot.data());
    if (repeatedClose(item, input, actor.uid)) return;
    const patch = buildClosePatch(actor, item, input);
    transaction.update(ref, { ...patch, [input.action === 'finished' ? 'finishedAt' : 'discardedAt']: serverTimestamp() });
  }); } catch (error) {
    if (error instanceof InventoryError) throw error;
    // Rules may reject the losing transaction before SDK conflict retry. Read
    // authoritative state to distinguish an actual competing close/lost ack.
    let snapshot;
    try { snapshot = await getDocFromServer(ref); } catch { throw error; }
    assertCurrentActor(actor);
    if (!snapshot.exists()) throw error;
    const current = normalizeItem(snapshot.id, snapshot.data());
    if (!repeatedClose(current, input, actor.uid)) {
      if (current.finished || current.discarded || current.isThrown) throw new InventoryError('already-closed', 'Another operation closed this batch');
      throw error;
    }
  }
  assertCurrentActor(actor);
  return receipt(input.operationId, ref.id);
}
/** C2 is online-only: there are no queued operations yet. C3 replaces this source. */
export function subscribeSyncOperations(listener: (operations: SyncOperation[]) => void): () => void {
  listener([]);
  return () => undefined;
}
