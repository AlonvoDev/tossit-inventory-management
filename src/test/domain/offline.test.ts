import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueStore, type QueueStore, type OfflineIntent } from '../../offline/queueStore';

const scope = { uid: 'staff-a', businessId: 'business-a' };
const other = { uid: 'staff-b', businessId: 'business-a' };
const intent = (): OfflineIntent => ({ kind: 'open', input: { operationId: 'offline-open-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 }, catalogFingerprint: 'milk/kg/bar/1' });
let name: string;
let stores: QueueStore[];
const store = () => { const instance = createQueueStore(name); stores.push(instance); return instance; };
beforeEach(() => { name = `tossit-test-${crypto.randomUUID()}`; stores = []; });
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.map(store => store.close()));
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
});
describe('durable account-scoped offline store', () => {
  it('persists the original payload and timestamps across closing and reopening the database', async () => {
    const first = store();
    const op = await first.enqueue(scope, intent());
    expect(op).toMatchObject({ state: 'pending', itemId: 'offline-open-1', attempts: 0 });
    await first.close();
    expect(await store().list(scope)).toEqual([op]);
  });
  it('rejects a failed durable write without returning a pending receipt or leaving half an operation', async () => {
    const queue = store();
    const failure = new DOMException('Storage full', 'QuotaExceededError');
    const add = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementationOnce(() => { throw failure; });
    await expect(queue.enqueue(scope, intent())).rejects.toBe(failure);
    add.mockRestore();
    expect(await queue.list(scope)).toEqual([]);
    expect(await queue.enqueue(scope, intent())).toMatchObject({ state: 'pending', sequence: 1 });
  });
  it('acknowledges one immutable intent and rejects a reused ID with a changed payload or action', async () => {
    const queue = store();
    const first = await queue.enqueue(scope, intent());
    expect(await queue.enqueue(scope, intent())).toEqual(first);
    await expect(queue.enqueue(scope, { ...intent(), input: { ...intent().input, amount: 1 } } as OfflineIntent)).rejects.toMatchObject({ code: 'invalid-input' });
    await expect(queue.enqueue(scope, { kind: 'close', input: { operationId: 'offline-open-1', itemId: 'another-item', action: 'finished' } })).rejects.toMatchObject({ code: 'invalid-input' });
    expect(await queue.list(scope)).toHaveLength(1);
  });
  it('isolates queue and cache between accounts and businesses without deleting pending work', async () => {
    const queue = store();
    await queue.enqueue(scope, intent());
    await queue.putCache(scope, 'items', [{ id: 'private-item' }]);
    expect(await queue.list(other)).toEqual([]);
    expect(await queue.list({ ...scope, businessId: 'another-business' })).toEqual([]);
    expect(await queue.getCache(other, 'items')).toBeUndefined();
    expect(await queue.getCache(scope, 'items')).toEqual([{ id: 'private-item' }]);
    expect(await queue.claimNext(other, 'worker-b', 1000)).toBeNull();
    expect(await queue.list(scope)).toHaveLength(1);
  });
  it('captures the owning scope before asynchronous database opening instead of retaining mutable session objects', async () => {
    const queue = store(); const mutable = { ...scope };
    const saving = queue.enqueue(mutable, intent());
    mutable.uid = other.uid;
    await saving;
    expect(await queue.list(scope)).toMatchObject([{ owner: scope }]);
    expect(await queue.list(other)).toEqual([]);
  });
  it('atomically lets only one tab lease a pending intent', async () => {
    const first = store(); const second = store();
    await first.enqueue(scope, intent());
    const claimed = await Promise.all([first.claimNext(scope, 'tab-a', 1000, 100), second.claimNext(scope, 'tab-b', 1000, 100)]);
    expect(claimed.filter(Boolean)).toHaveLength(1);
    expect(claimed.find(Boolean)).toMatchObject({ attempts: 1 });
  });
  it('preserves insertion order when open and close are queued in the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const queue = store();
    const opening: OfflineIntent = { ...intent(), input: { ...(intent() as Extract<OfflineIntent, { kind: 'open' }>).input, operationId: 'z-opening-1' } } as OfflineIntent;
    await queue.enqueue(scope, opening);
    await queue.enqueue(scope, { kind: 'close', input: { operationId: 'a-closing-1', itemId: 'z-opening-1', action: 'finished' } });
    expect((await queue.claimNext(scope, 'worker', 1000))?.operationId).toBe('z-opening-1');
    expect((await queue.list(scope)).map(op => op.operationId)).toEqual(['z-opening-1', 'a-closing-1']);
  });
  it('recovers an interrupted lease after expiry and refuses stale-owner acknowledgement', async () => {
    const queue = store(); await queue.enqueue(scope, intent());
    await queue.claimNext(scope, 'crashed-tab', 1000, 100);
    expect(await queue.claimNext(scope, 'restarted-tab', 1099, 100)).toBeNull();
    expect(await queue.claimNext(scope, 'restarted-tab', 1100, 100)).toMatchObject({ attempts: 2 });
    expect(await queue.settle(scope, 'offline-open-1', 'crashed-tab', 'synced')).toBe(false);
    expect(await queue.settle(scope, 'offline-open-1', 'restarted-tab', 'synced')).toBe(true);
    expect(await queue.claimNext(scope, 'third-tab', 2000)).toBeNull();
    expect(await queue.list(scope)).toMatchObject([{ state: 'synced', attempts: 2 }]);
  });
  it('retains explicit conflicts and retries transient failures using the same original payload', async () => {
    const queue = store(); await queue.enqueue(scope, intent());
    await queue.claimNext(scope, 'tab', 1000);
    await queue.settle(scope, 'offline-open-1', 'tab', 'failed', 'catalog-changed');
    expect(await queue.claimNext(scope, 'next-tab', 40000)).toBeNull();
    expect(await queue.list(scope)).toMatchObject([{ state: 'failed', errorCode: 'catalog-changed', intent: intent() }]);
    await queue.retry(scope, 'offline-open-1');
    const retry = await queue.claimNext(scope, 'next-tab', 40000);
    expect(retry?.intent).toEqual(intent());
    expect(await queue.release(scope, 'offline-open-1', 'next-tab', 'unavailable')).toBe(true);
    expect(await queue.list(scope)).toMatchObject([{ state: 'pending', errorCode: 'unavailable' }]);
  });
  it('serializes cache timestamps and never changes original offline opening instants', async () => {
    const queue = store();
    await queue.putCache(scope, 'items', [{ openingTime: { seconds: 1700000000, nanoseconds: 0 } }]);
    expect(await store().getCache(scope, 'items')).toEqual([{ openingTime: { seconds: 1700000000, nanoseconds: 0 } }]);
    await expect(queue.putCache(scope, 'bad', { amount: NaN })).rejects.toMatchObject({ code: 'invalid-input' });
  });
  it('persists verified profile snapshots by UID and can revoke them without deleting pending work', async () => {
    const queue = store(); await queue.enqueue(scope, intent());
    await queue.putProfile(scope.uid, { ...scope, role: 'staff' });
    expect(await store().getProfile(scope.uid)).toMatchObject(scope);
    expect(await queue.getProfile(other.uid)).toBeUndefined();
    await queue.removeProfile(scope.uid);
    expect(await queue.getProfile(scope.uid)).toBeUndefined();
    expect(await queue.list(scope)).toHaveLength(1);
  });
  it('upgrades the previous database schema without losing operations or their sequence', async () => {
    const old = store(); const record = await old.enqueue(scope, intent()); await old.close();
    await new Promise<void>(resolve => { const drop = indexedDB.deleteDatabase(name); drop.onsuccess = () => resolve(); });
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open(name, 1);
      opening.onupgradeneeded = () => {
        opening.result.createObjectStore('operations', { keyPath: 'key' }).createIndex('scope', 'scope');
        for (const table of ['cache', 'legacy']) opening.result.createObjectStore(table, { keyPath: 'key' });
        opening.result.createObjectStore('meta');
      };
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result; const tx = db.transaction(['operations', 'meta'], 'readwrite');
        tx.objectStore('operations').put(record); tx.objectStore('meta').put(1, 'sequence');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
    const upgraded = store(); expect(await upgraded.list(scope)).toEqual([record]);
    expect(await upgraded.getProfile(scope.uid)).toBeUndefined();
    expect(await upgraded.enqueue(scope, { kind: 'close', input: { operationId: 'new-close-1', itemId: 'existing', action: 'finished' } })).toMatchObject({ sequence: 2 });
  });
  it('quarantines malformed and unattributed legacy operations without changing the source', async () => {
    const queue = store();
    const values = [{ sourceKey: 'pendingOperations', raw: '{broken' }, { sourceKey: 'cachedItems_all', raw: '[{"id":"old-item"}]' }];
    await queue.quarantineLegacy(values);
    await queue.quarantineLegacy(values);
    const review = await queue.listLegacyReviews();
    expect(review).toHaveLength(2);
    expect(review).toEqual(expect.arrayContaining([expect.objectContaining({ sourceKey: 'pendingOperations', raw: '{broken', status: 'corrupt' }), expect.objectContaining({ sourceKey: 'cachedItems_all', status: 'unattributed' })]));
    expect(values[0].raw).toBe('{broken');
    expect(await queue.list(scope)).toEqual([]);
  });
});
