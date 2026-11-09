import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types/UserProfile';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import { assertCurrentActor, getInventoryActor, isInventoryOnline, isUnavailable } from '../api/access';
import { closeInventoryItemOnline, findInventoryAcknowledgement, openInventoryItemOnline } from '../api/inventoryOnline';
import { normalizeItem } from '../domain/normalizeItem';
import { InventoryError } from '../domain/errors';
import { createInventoryController } from './inventoryController';
import { offlineStore } from './storage';

let activeActor: UserProfile | null = null;
let broadcast: (() => void) | undefined;
let reportError: ((error: unknown) => void) | undefined;
export const currentOfflineScope = () => activeActor && auth.currentUser?.uid === activeActor.uid ? { uid: activeActor.uid, businessId: activeActor.businessId } : null;
export const getOfflineActor = () => currentOfflineScope() ? activeActor : null;
export function setOfflineActor(actor: UserProfile | null) { activeActor = actor && auth.currentUser?.uid === actor.uid ? actor : null; inventoryController.scopeChanged(); }
async function actorForInventory() {
  const actor = await getInventoryActor(); activeActor = actor; return actor;
}
async function documentData(collection: 'products' | 'fridges' | 'items', id: string): Promise<Record<string, unknown> | null> {
  const actor = await actorForInventory();
  if (isInventoryOnline()) {
    try {
      const snapshot = await getDocFromServer(doc(db, collection, id)); assertCurrentActor(actor);
      if (!snapshot.exists()) return null;
      return { ...snapshot.data(), id: snapshot.id };
    } catch (error) { if (!isUnavailable(error)) throw error; }
  }
  const cached = await offlineStore.getCache<Record<string, unknown>[]>(actor, collection);
  assertCurrentActor(actor);
  return cached?.find(record => record.id === id && record.businessId === actor.businessId) ?? null;
}
async function loadCatalog(productId: string, fridgeId?: string) {
  const product = await documentData('products', productId) as unknown as Product | null;
  if (!product) return null;
  const fridge = fridgeId ? await documentData('fridges', fridgeId) as unknown as Fridge | null : undefined;
  if (fridgeId && !fridge) return null;
  return { product, ...(fridge ? { fridge } : {}) };
}
export const inventoryController = createInventoryController({
  store: offlineStore, currentScope: currentOfflineScope, getActor: actorForInventory, isOnline: isInventoryOnline, loadCatalog,
  async loadItem(id, actor) {
    const pending = (await offlineStore.list(actor)).filter(op => op.state === 'pending' && op.itemId === id && op.intent.preview);
    if (pending.length) return normalizeItem(id, pending[pending.length - 1].intent.preview!);
    const data = await documentData('items', id);
    if (!data) throw new InventoryError('unavailable', 'No verified inventory snapshot is available');
    return normalizeItem(id, data);
  },
  lookupAcknowledgement: findInventoryAcknowledgement,
  execute: (intent, scope) => intent.kind === 'open' ? openInventoryItemOnline(intent.input, scope, intent.catalogFingerprint) : closeInventoryItemOnline(intent.input, scope),
  onChange: () => broadcast?.(), onError: error => reportError?.(error),
});
export async function projectInventory(items: ReturnType<typeof normalizeItem>[], actor: UserProfile) {
  assertCurrentActor(actor);
  if (activeActor && activeActor.uid === actor.uid && activeActor.businessId !== actor.businessId) throw new InventoryError('unauthenticated', 'Business changed during inventory read');
  activeActor = actor;
  return inventoryController.project(items, actor);
}
export async function quarantineLegacyStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const values: { sourceKey: string; raw: string }[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const sourceKey = localStorage.key(index)!;
    if (sourceKey === 'pendingOperations' || /^(cachedItems_|cachedProducts_|products_)/.test(sourceKey)) {
      const raw = localStorage.getItem(sourceKey); if (raw !== null) values.push({ sourceKey, raw });
    }
  }
  await offlineStore.quarantineLegacy(values); // Never remove or attribute the original source keys.
}
export function startOfflineLifecycle(actor: UserProfile | null, onError: (error: unknown) => void = () => undefined): () => void {
  let disposed = false;
  const report = (error: unknown) => { if (!disposed) onError(error); };
  setOfflineActor(actor); reportError = report;
  const safe = () => { void inventoryController.refresh(); void inventoryController.replay().catch(report); };
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tossit-offline-changed') : undefined;
  broadcast = () => channel?.postMessage('changed');
  if (channel) channel.onmessage = safe;
  window.addEventListener('online', safe);
  const timer = window.setInterval(safe, 30000);
  void quarantineLegacyStorage().catch(report); safe();
  return () => { disposed = true; window.removeEventListener('online', safe); window.clearInterval(timer); channel?.close(); broadcast = undefined; reportError = undefined; setOfflineActor(null); };
}
