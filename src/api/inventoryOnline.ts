import { doc, getDocFromServer, runTransaction, serverTimestamp, setDoc, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import type { CloseInventoryItemInput, InventoryItem, OpenInventoryItemInput, WriteReceipt } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';
import { buildClosePatch, buildInventoryItem } from '../domain/inventory';
import { normalizeItem } from '../domain/normalizeItem';
import { assertCurrentActor, getCurrentActor } from './access';
import type { OfflineIntent, OfflineScope } from '../offline/queueStore';
import { catalogFingerprint } from '../offline/replay';

function online() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new InventoryError('unavailable', 'A server write requires connectivity');
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
export async function openInventoryItemOnline(input: OpenInventoryItemInput, expectedScope?: OfflineScope, expectedCatalog?: string): Promise<WriteReceipt> {
  online(); validId(input.operationId);
  const actor = await getCurrentActor();
  assertExpected(actor, expectedScope);
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
  if (expectedCatalog !== undefined && catalogFingerprint(product, fridge) !== expectedCatalog) throw new InventoryError('catalog-changed', 'Catalog changed before the replay write');
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
export async function closeInventoryItemOnline(input: CloseInventoryItemInput, expectedScope?: OfflineScope): Promise<WriteReceipt> {
  online(); validId(input.operationId);
  if (!input.itemId || input.itemId.includes('/')) invalid('Invalid item ID');
  const actor = await getCurrentActor();
  assertExpected(actor, expectedScope);
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

function assertExpected(actor: { uid: string; businessId: string }, expected?: OfflineScope) {
  if (expected && (actor.uid !== expected.uid || actor.businessId !== expected.businessId)) throw new InventoryError('unauthenticated', 'Replay belongs to another account or business');
}
export async function findInventoryAcknowledgement(intent: OfflineIntent, scope: OfflineScope): Promise<WriteReceipt | null> {
  const actor = await getCurrentActor(); assertExpected(actor, scope);
  const itemId = intent.kind === 'open' ? intent.input.operationId : intent.input.itemId;
  let snapshot;
  try { snapshot = await getDocFromServer(doc(db, 'items', itemId)); } catch (error) {
    assertCurrentActor(actor);
    if ((error as { code?: string }).code === 'permission-denied') return null; // Scoped rules also deny missing IDs.
    throw error;
  }
  assertCurrentActor(actor);
  if (!snapshot.exists()) return null;
  const item = normalizeItem(snapshot.id, snapshot.data());
  if (intent.kind === 'close') return repeatedClose(item, intent.input, actor.uid) ? receipt(intent.input.operationId, itemId) : null;
  if (item.userId !== actor.uid || item.businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Opening belongs to another account');
  if (item.productId !== intent.input.productId || item.amount !== intent.input.amount || item.openingTime.toMillis() !== intent.input.openedAtMs || item.fridgeId !== intent.input.fridgeId) invalid('Operation ID already belongs to another opening');
  return receipt(intent.input.operationId, itemId);
}
