import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueStore, type OfflineIntent, type QueueStore } from '../../offline/queueStore';
import { replayQueue, catalogFingerprint } from '../../offline/replay';
import type { WriteReceipt } from '../../domain/contracts';
const scope = { uid: 'staff-a', businessId: 'business-a' };
const product = { id: 'milk', productId: 'P001', businessId: 'business-a', name: 'Milk', type: 'kg' as const, area: 'bar' as const, shelfLifeDays: 1 };
const intent = (): OfflineIntent => ({ kind: 'open', input: { operationId: 'offline-open-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 }, catalogFingerprint: catalogFingerprint(product) });
let queue: QueueStore;
let current: typeof scope | null;
let online: boolean;
let name: string;
const ack = (operation: OfflineIntent): WriteReceipt => ({ operationId: operation.input.operationId, itemId: operation.kind === 'open' ? operation.input.operationId : operation.input.itemId, state: 'synced' });
const failure = (code: string) => Object.assign(new Error(code), { code });
const runner = (execute: (intent: OfflineIntent) => Promise<WriteReceipt>) => replayQueue({ store: queue, scope, currentScope: () => current, isOnline: () => online, execute, lookupAcknowledgement: async () => null, loadCatalog: async () => ({ product }), now: () => 1000 });
beforeEach(() => { name = `replay-test-${crypto.randomUUID()}`; queue = createQueueStore(name); current = { ...scope }; online = true; });
afterEach(async () => { await queue.close(); await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); }); });
describe('durable replay lifecycle', () => {
  it('does not replay another account or business, or while offline', async () => {
    await queue.enqueue(scope, intent()); const execute = vi.fn(async op => ack(op));
    current = { ...scope, uid: 'someone-else' }; await runner(execute);
    current = { ...scope, businessId: 'someone-elses-business' }; await runner(execute);
    current = scope; online = false; await runner(execute);
    expect(execute).not.toHaveBeenCalled();
    expect(await queue.list(scope)).toMatchObject([{ state: 'pending', attempts: 0 }]);
  });
  it('retains lost-ack writes and retries the original stable ID without duplicating the server item', async () => {
    await queue.enqueue(scope, intent()); const server = new Map(); let loseAck = true;
    const execute = vi.fn(async (op: OfflineIntent) => {
      server.set(op.input.operationId, op);
      if (loseAck) { loseAck = false; throw failure('unavailable'); }
      return ack(op);
    });
    await runner(execute);
    expect(await queue.list(scope)).toMatchObject([{ state: 'pending', errorCode: 'unavailable', attempts: 1 }]);
    await queue.close(); queue = createQueueStore(name); await runner(execute);
    expect(server.size).toBe(1);
    expect(execute.mock.calls[0][0]).toEqual(execute.mock.calls[1][0]);
    expect(await queue.list(scope)).toMatchObject([{ state: 'synced', attempts: 2 }]);
  });
  it('lets only one concurrent worker execute an intent', async () => {
    await queue.enqueue(scope, intent());
    let release!: () => void;
    const execute = vi.fn(async (op: OfflineIntent) => { await new Promise<void>(resolve => { release = resolve; }); return ack(op); });
    const first = runner(execute);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await runner(execute); release(); await first;
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await queue.list(scope)).toMatchObject([{ state: 'synced' }]);
  });
  it.each(['catalog-changed', 'already-closed', 'permission-denied', 'not-on-shift'])('retains %s as an explicit failed conflict without automatic retry', async code => {
    await queue.enqueue(scope, intent());
    const execute = vi.fn(async () => { throw failure(code); });
    await runner(execute); await runner(execute);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await queue.list(scope)).toMatchObject([{ state: 'failed', errorCode: code, intent: intent() }]);
  });
  it('stops replay after logout during a request and preserves the unresolved original operation', async () => {
    await queue.enqueue(scope, intent());
    await runner(async op => { current = null; return ack(op); });
    expect(await queue.list(scope)).toMatchObject([{ state: 'pending', intent: intent() }]);
    current = scope; await runner(async op => ack(op));
    expect(await queue.list(scope)).toMatchObject([{ state: 'synced' }]);
  });
  it('does not mark a queued operation synced from a pending or mismatched receipt', async () => {
    await queue.enqueue(scope, intent());
    await runner(async op => ({ ...ack(op), itemId: 'wrong-item' }));
    expect(await queue.list(scope)).toMatchObject([{ state: 'failed', errorCode: 'invalid-input' }]);
  });
  it('rejects changed catalog configuration before executing, retaining the original payload', async () => {
    await queue.enqueue(scope, intent()); const execute = vi.fn(async op => ack(op));
    await replayQueue({ store: queue, scope, currentScope: () => current, isOnline: () => online, execute, lookupAcknowledgement: async () => null, loadCatalog: async () => ({ product: { ...product, shelfLifeDays: 7 } }) });
    expect(execute).not.toHaveBeenCalled();
    expect(await queue.list(scope)).toMatchObject([{ state: 'failed', errorCode: 'catalog-changed', intent: intent() }]);
  });
  it('does not execute under a different account after awaiting catalog reads', async () => {
    await queue.enqueue(scope, intent()); const execute = vi.fn(async op => ack(op));
    await replayQueue({ store: queue, scope, currentScope: () => current, isOnline: () => online, execute, lookupAcknowledgement: async () => null, loadCatalog: async () => { current = { ...scope, uid: 'new-account' }; return { product }; } });
    expect(execute).not.toHaveBeenCalled();
    expect(await queue.list(scope)).toMatchObject([{ state: 'pending' }]);
  });
  it('compares catalog configuration rather than regenerated opening times or display codes', () => {
    const capture = catalogFingerprint(product);
    expect(catalogFingerprint({ ...product, productId: 'P999' })).toBe(capture);
    expect(catalogFingerprint({ ...product, shelfLifeDays: 7 })).not.toBe(capture);
    expect(catalogFingerprint({ ...product, type: 'units' })).not.toBe(capture);
    expect(catalogFingerprint({ ...product, area: 'kitchen' })).not.toBe(capture);
  });
  it('recovers an already committed write before checking a subsequently changed catalog', async () => {
    await queue.enqueue(scope, intent());
    const execute = vi.fn(async op => ack(op));
    const loadCatalog = vi.fn(async () => ({ product: { ...product, shelfLifeDays: 7 } }));
    await replayQueue({ store: queue, scope, currentScope: () => current, isOnline: () => online, execute, lookupAcknowledgement: async op => ack(op), loadCatalog });
    expect(execute).not.toHaveBeenCalled();
    expect(loadCatalog).not.toHaveBeenCalled();
    expect(await queue.list(scope)).toMatchObject([{ state: 'synced' }]);
  });
});
