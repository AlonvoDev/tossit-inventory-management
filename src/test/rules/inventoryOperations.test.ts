import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, setLogLevel, type Firestore } from 'firebase/firestore';
import { openInventoryItem, closeInventoryItem } from '../../api/inventoryOperations';
const state = vi.hoisted(() => ({ db: undefined as unknown as Firestore, uid: 'staff' as string | null }));
vi.mock('../../services/firebase', () => ({ get db() { return state.db; }, auth: { get currentUser() { return state.uid ? { uid: state.uid } : null; } } }));
let env: RulesTestEnvironment;
const input = () => ({ operationId: 'opening-test-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 });
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulator required');
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-tossit-auth', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore(); state.uid = 'staff';
  state.db = env.authenticatedContext('staff').firestore() as unknown as Firestore;
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/staff'), { role: 'staff', businessId: 'a', department: 'bar', isOnShift: true, email: 'staff@example.test', fullName: 'Staff' });
    await setDoc(doc(db, 'products/milk'), { name: 'Milk', businessId: 'a', area: 'bar', type: 'kg', shelfLifeDays: 1 });
    await setDoc(doc(db, 'products/units'), { name: 'Bottle', businessId: 'a', area: 'bar', type: 'units', shelfLifeDays: 7 });
  });
});
describe('inventory operations against real Firestore rules', () => {
  it('acknowledges catalog-derived kg creation and retries without creating another batch', async () => {
    const first = await openInventoryItem(input());
    expect(first).toEqual({ operationId: 'opening-test-1', itemId: 'opening-test-1', state: 'synced' });
    expect(await openInventoryItem(input())).toEqual(first);
    const snapshot = await getDoc(doc(state.db, 'items', first.itemId));
    expect(snapshot.data()).toMatchObject({ productId: 'milk', type: 'kg', amount: 0.5, userId: 'staff' });
    expect(snapshot.data()!.expiryTime.toMillis()).toBe(1700086400000);
    await expect(openInventoryItem({ ...input(), amount: 1 })).rejects.toMatchObject({ code: 'invalid-input' });
  });
  it('uses the seven-day catalog and refuses fractional units', async () => {
    await expect(openInventoryItem({ ...input(), productId: 'units' })).rejects.toMatchObject({ code: 'invalid-input' });
    const result = await openInventoryItem({ ...input(), productId: 'units', amount: 2 });
    const snapshot = await getDoc(doc(state.db, 'items', result.itemId));
    expect(snapshot.data()!.expiryTime.toMillis()).toBe(1700604800000);
  });
  it('acknowledges an existing opening even if its catalog product was later removed', async () => {
    const first = await openInventoryItem(input());
    await env.withSecurityRulesDisabled(async context => { await deleteDoc(doc(context.firestore(), 'products/milk')); });
    expect(await openInventoryItem(input())).toEqual(first);
  });
  it('acknowledges concurrent retries of the identical close action', async () => {
    const { itemId } = await openInventoryItem(input());
    const close = { operationId: 'same-finish-1', itemId, action: 'finished' as const };
    const results = await Promise.all([closeInventoryItem(close), closeInventoryItem(close)]);
    expect(results[0]).toEqual(results[1]);
  });
  it('records server audit time and makes a repeated close idempotent', async () => {
    const opened = await openInventoryItem(input());
    const close = { operationId: 'discard-test-1', itemId: opened.itemId, action: 'discarded' as const, discardedAmount: 0.25, reason: 'damaged' as const };
    expect(await closeInventoryItem(close)).toMatchObject({ state: 'synced' });
    expect(await closeInventoryItem(close)).toMatchObject({ state: 'synced' });
    const item = (await getDoc(doc(state.db, 'items', opened.itemId))).data()!;
    expect(item).toMatchObject({ discarded: true, finished: false, isThrown: true, discardedBy: 'staff', discardedQuantity: 0.25, closedOperationId: 'discard-test-1' });
    expect(item.discardedAt.toMillis()).toBeGreaterThan(1700000000000);
    await expect(closeInventoryItem({ ...close, discardedAmount: 0.5 })).rejects.toMatchObject({ code: 'invalid-input' });
  });
  it('allows only one winner when finish and discard race', async () => {
    const { itemId } = await openInventoryItem(input());
    const results = await Promise.allSettled([
      closeInventoryItem({ operationId: 'finish-race-1', itemId, action: 'finished' }),
      closeInventoryItem({ operationId: 'discard-race-1', itemId, action: 'discarded', discardedAmount: 0.5, reason: 'expired' }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'already-closed' });
    const item = (await getDoc(doc(state.db, 'items', itemId))).data()!;
    expect(item.finished !== item.discarded).toBe(true);
  });
  it('never converts permission failure into a fake receipt or a localStorage operation', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/staff'), { role: 'staff', businessId: 'a', department: 'bar', isOnShift: true, isActive: false, email: 'staff@example.test' });
    });
    await expect(openInventoryItem(input())).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('legacy API compatibility and scoped reports', () => {
  it('streams scoped inventory changes and supports cancellation before its profile read resolves', async () => {
    const { subscribeBusinessItems } = await import('../../api/firestoreAPI');
    const cancelled = vi.fn();
    subscribeBusinessItems('a', cancelled, cancelled)();
    let unsubscribe = () => undefined as void;
    const seen = new Promise<string[]>((resolve, reject) => {
      unsubscribe = subscribeBusinessItems('a', items => {
        if (items.length) resolve(items.map(item => item.id!));
      }, reject);
    });
    try {
      await openInventoryItem(input());
      expect(await seen).toEqual(['opening-test-1']);
      expect(cancelled).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
  it('opens through the legacy signature using catalog identity, unit and expiry', async () => {
    const { addItem } = await import('../../api/firestoreAPI');
    const id = await addItem('milk', 'Untrusted display name', 0.5, 'בר', 'a', 'staff');
    const data = (await getDoc(doc(state.db, 'items', id))).data()!;
    expect(data).toMatchObject({ productId: 'milk', productName: 'Milk', type: 'kg', amount: 0.5 });
    expect(data.expiryTime.toMillis() - data.openingTime.toMillis()).toBe(86400000);
  });
  it('returns department-scoped products, fridges and inventory without stale cache fallback', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'products/kitchen'), { name: 'Sauce', businessId: 'a', area: 'kitchen', type: 'kg', shelfLifeDays: 3 });
      await setDoc(doc(db, 'fridges/bar'), { name: 'Bar', businessId: 'a', department: 'בר' });
      await setDoc(doc(db, 'fridges/kitchen'), { name: 'Kitchen', businessId: 'a', department: 'kitchen' });
    });
    const { getBusinessProducts } = await import('../../api/productsAPI');
    const { getBusinessFridges } = await import('../../api/fridgesAPI');
    const { getBusinessItems } = await import('../../api/firestoreAPI');
    await openInventoryItem(input());
    expect((await getBusinessProducts('a')).map(product => product.id).sort()).toEqual(['milk', 'units']);
    expect((await getBusinessFridges('a')).map(fridge => fridge.id)).toEqual(['bar']);
    expect(await getBusinessItems('a')).toHaveLength(1);
    await expect(getBusinessItems('b')).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('preserves discard audit data and excludes undated legacy waste from bounded reports', async () => {
    const { itemId } = await openInventoryItem(input());
    await closeInventoryItem({ operationId: 'discard-report-1', itemId, action: 'discarded', discardedAmount: 0.25, reason: 'damaged' });
    const current = (await getDoc(doc(state.db, 'items', itemId))).data()!;
    await env.withSecurityRulesDisabled(async context => {
      const legacy = { ...current };
      delete legacy.discardedAt;
      await setDoc(doc(context.firestore(), 'items/legacy-undated'), { ...legacy, productId: 'different', type: 'units', amount: 2, discardedQuantity: 1 });
    });
    const { getDiscardReport, getDiscardedItemsWithDateFilter } = await import('../../api/firestoreAPI');
    const all = await getDiscardReport('a');
    expect(all).toHaveLength(2); // Same name with kg/units must never be combined.
    const report = await getDiscardReport('a', new Date(Date.now() - 60000), new Date(Date.now() + 60000), 'damaged');
    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({ totalQuantity: 0.25, discardCount: 1, reasons: { damaged: 1, expired: 0, other: 0 }, type: 'kg' });
    expect(await getDiscardedItemsWithDateFilter('a', undefined, undefined, 'expired')).toEqual([]);
  });
});

describe('catalog mutations and actual category collection', () => {
  async function manager(role = 'manager') {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/staff'), { role, businessId: 'a', department: 'bar', isOnShift: true, email: 'staff@example.test', fullName: 'Manager' });
    });
  }
  it('lets a manager maintain only their department catalog, validating shelf life and fridge', async () => {
    await manager();
    const { addProduct, updateProduct, deleteProduct } = await import('../../api/productsAPI');
    const { addFridge } = await import('../../api/fridgesAPI');
    const fridgeId = await addFridge({ name: 'Bar', department: 'bar', businessId: 'a' });
    const product = { productId: 'P001', name: 'Other milk', shelfLifeDays: 7, type: 'kg' as const, area: 'bar' as const, businessId: 'a', fridgeId };
    const id = await addProduct(product);
    await updateProduct(id, { shelfLifeDays: 1 });
    expect((await getDoc(doc(state.db, 'products', id))).data()!.shelfLifeDays).toBe(1);
    await expect(addProduct({ ...product, shelfLifeDays: 1.5 })).rejects.toMatchObject({ code: 'invalid-input' });
    await expect(addProduct({ ...product, area: 'kitchen' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateProduct(id, { type: 'units' })).rejects.toMatchObject({ code: 'invalid-input' });
    await deleteProduct(id, 'a');
  });
  it('supports productCategories with admin-only mutations and scoped reads', async () => {
    const { getBusinessCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } = await import('../../api/categoriesAPI');
    await manager('admin');
    const id = await addCustomCategory({ name: 'Dairy', businessId: 'a', createdBy: 'forged' });
    expect((await getBusinessCategories('a')).map(category => category.name)).toEqual(['Dairy']);
    expect((await getDoc(doc(state.db, 'productCategories', id))).data()!.createdBy).toBe('staff');
    await updateCustomCategory(id, { name: 'Milk' });
    await manager();
    await expect(deleteCustomCategory(id)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await getBusinessCategories('a')).toHaveLength(1);
  });
});
