import 'fake-indexeddb/auto';
import { Timestamp } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueStore, type QueueStore } from '../../offline/queueStore';
import { createInventoryController } from '../../offline/inventoryController';
vi.mock('firebase/firestore', async original => original<typeof import('firebase/firestore')>());
const actor = { uid: 'staff', email: 'staff@example.test', fullName: 'Staff', role: 'staff' as const, department: 'bar' as const, businessId: 'a', isOnShift: true };
const product = { id: 'milk', productId: 'P001', name: 'Milk', businessId: 'a', area: 'bar' as const, type: 'kg' as const, shelfLifeDays: 1 };
const input = () => ({ operationId: 'controller-open-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 });
let queue: QueueStore; let name: string; let online: boolean; let uid: string;
let catalogDays: number;
const fail = (code: string) => Object.assign(new Error(code), { code });
function setup() {
  const execute = vi.fn(async (intent: import('../../offline/queueStore').OfflineIntent) => ({ operationId: intent.input.operationId, itemId: intent.kind === 'open' ? intent.input.operationId : intent.input.itemId, state: 'synced' as const }));
  const controller = createInventoryController({ store: queue, currentScope: () => uid ? { uid, businessId: 'a' } : null,
    getActor: async () => actor, isOnline: () => online, loadCatalog: async () => ({ product: { ...product, shelfLifeDays: catalogDays } }),
    loadItem: async () => ({ id: 'existing', productName: 'Milk', type: 'kg', amount: 0.5, openingTime: Timestamp.fromMillis(1700000000000), expiryTime: Timestamp.fromMillis(1700086400000), businessId: 'a', userId: 'staff', area: 'bar', finished: false, discarded: false, isThrown: false }),
    lookupAcknowledgement: async () => null, execute, requestWaitMs: 10,
  });
  return { controller, execute };
}
beforeEach(() => { name = `controller-${crypto.randomUUID()}`; queue = createQueueStore(name); online = false; uid = 'staff'; catalogDays = 1; });
afterEach(async () => { await queue.close(); await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); }); });
describe('inventory API offline controller', () => {
  it('commits a pending opening before returning and restores it after reload', async () => {
    const { controller, execute } = setup();
    expect(await controller.open(input())).toEqual({ operationId: input().operationId, itemId: input().operationId, state: 'pending' });
    expect(execute).not.toHaveBeenCalled();
    await queue.close(); queue = createQueueStore(name);
    const saved = (await queue.list(actor))[0];
    expect(saved.intent).toMatchObject({ kind: 'open', input: input(), preview: { type: 'kg', amount: 0.5 } });
  });
  it('replays the captured opening after connectivity returns and reports only server-acknowledged sync', async () => {
    const { controller, execute } = setup(); await controller.open(input());
    online = true; await controller.replay();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].input).toEqual(input());
    expect((await queue.list(actor))[0].state).toBe('synced');
    expect(await controller.open(input())).toMatchObject({ state: 'synced' });
  });
  it('keeps real permission failures failed and rejects the online call', async () => {
    online = true; const { controller, execute } = setup();
    execute.mockRejectedValue(fail('permission-denied'));
    await expect(controller.open(input())).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await queue.list(actor)).toMatchObject([{ state: 'failed', errorCode: 'permission-denied' }]);
  });
  it('returns durable pending after an online transport failure and retries the same ID', async () => {
    online = true; const { controller, execute } = setup(); execute.mockRejectedValueOnce(fail('unavailable'));
    expect(await controller.open(input())).toMatchObject({ state: 'pending' });
    await controller.replay();
    expect(execute.mock.calls[0][0]).toEqual(execute.mock.calls[1][0]);
    expect((await queue.list(actor))[0].state).toBe('synced');
  });
  it('does not hide a changed catalog or regenerate the original expiry', async () => {
    const { controller, execute } = setup(); await controller.open(input());
    catalogDays = 7; online = true; await controller.replay();
    expect(execute).not.toHaveBeenCalled();
    expect(await queue.list(actor)).toMatchObject([{ state: 'failed', errorCode: 'catalog-changed', intent: { input: input() } }]);
  });
  it('validates kg/units and discard bounds before saving any operation', async () => {
    const { controller } = setup();
    await expect(controller.open({ ...input(), amount: NaN })).rejects.toMatchObject({ code: 'invalid-input' });
    await expect(controller.close({ operationId: 'controller-close-1', itemId: 'existing', action: 'discarded', discardedAmount: 1, reason: 'expired' })).rejects.toMatchObject({ code: 'invalid-input' });
    expect(await queue.list(actor)).toEqual([]);
  });
  it('does not expose the old account queue after logout and cancels late subscription reads', async () => {
    const { controller } = setup(); await controller.open(input());
    const listener = vi.fn(); const stop = controller.subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ state: 'pending' })])));
    uid = ''; controller.scopeChanged();
    expect(listener).toHaveBeenLastCalledWith([]);
    stop();
  });
  it('does not let a retry bind one ID to a different payload', async () => {
    const { controller } = setup(); await controller.open(input());
    await expect(controller.open({ ...input(), amount: 1 })).rejects.toMatchObject({ code: 'invalid-input' });
  });
  it('retains acknowledged open and close overlays until the durable server snapshot catches up', async () => {
    online = true; const { controller } = setup(); await controller.open(input());
    const opened = await controller.project([], actor);
    expect(opened).toHaveLength(1);
    await controller.close({ operationId: 'controller-finish-1', itemId: 'existing', action: 'finished' });
    const staleBase = { ...opened[0], id: 'existing' };
    expect((await controller.project([staleBase], actor)).find(item => item.id === 'existing')?.finished).toBe(true);
    // A later server-authoritative terminal record must not be replaced by an older open preview.
    const authoritative = { ...opened[0], finished: true, finishedBy: 'manager', closedOperationId: 'server-close-1' };
    expect((await controller.project([authoritative], actor)).find(item => item.id === input().operationId)?.finishedBy).toBe('manager');
  });
  it('restarts an expired in-flight worker after timeout rather than blocking the tab forever', async () => {
    online = true; const { controller, execute } = setup();
    let now = Date.now(); const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    let finish!: () => void;
    execute.mockImplementationOnce(async intent => { await new Promise<void>(resolve => { finish = resolve; }); return { operationId: intent.input.operationId, itemId: intent.input.operationId, state: 'synced' }; });
    try {
      expect(await controller.open(input())).toMatchObject({ state: 'pending' });
      now += 31000; await controller.replay();
      expect(execute).toHaveBeenCalledTimes(2);
      expect((await queue.list(actor))[0].state).toBe('synced');
    } finally { finish(); clock.mockRestore(); }
  });
});
