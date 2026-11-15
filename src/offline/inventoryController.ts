import type { UserProfile } from '../types/UserProfile';
import type { CloseInventoryItemInput, InventoryItem, OpenInventoryItemInput, SyncOperation, WriteReceipt } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';
import { buildClosePatch, buildInventoryItem } from '../domain/inventory';
import { normalizeItem, normalizeDepartment } from '../domain/normalizeItem';
import { catalogFingerprint, replayQueue, type ReplayOptions } from './replay';
import type { OfflineIntent, OfflineScope, QueueStore, StoredOperation } from './queueStore';

export interface ControllerOptions extends Pick<ReplayOptions, 'currentScope' | 'isOnline' | 'loadCatalog' | 'lookupAcknowledgement' | 'execute'> {
  store: QueueStore;
  getActor(): Promise<UserProfile>;
  loadItem(id: string, actor: UserProfile): Promise<InventoryItem>;
  requestWaitMs?: number;
  onChange?(): void;
  onError?(error: unknown): void;
}
function inputKey(intent: OfflineIntent): string {
  const i = intent.input;
  return intent.kind === 'open'
    ? JSON.stringify(['open', i.operationId, intent.input.productId, intent.input.amount, intent.input.openedAtMs, intent.input.fridgeId ?? null])
    : JSON.stringify(['close', i.operationId, intent.input.itemId, intent.input.action, intent.input.discardedAmount ?? null, intent.input.reason ?? null]);
}
function receipt(op: StoredOperation): WriteReceipt {
  if (op.state === 'failed') throw Object.assign(new Error('Inventory operation failed; review its retained conflict'), { code: op.errorCode ?? 'unavailable' });
  return { operationId: op.operationId, itemId: op.itemId, state: op.state };
}
export function createInventoryController(options: ControllerOptions) {
  const listeners = new Set<(operations: SyncOperation[]) => void>();
  let revision = 0;
  let running: { key: string; promise: Promise<void>; startedAt: number } | undefined;
  const sameScope = (scope: OfflineScope) => {
    const current = options.currentScope();
    return current?.uid === scope.uid && current.businessId === scope.businessId;
  };
  const assertScope = (scope: OfflineScope) => { if (!sameScope(scope)) throw new InventoryError('unauthenticated', 'Active inventory account or business changed'); };
  async function refresh() {
    const generation = ++revision;
    const scope = options.currentScope();
    if (!scope) { for (const listener of listeners) listener([]); return; }
    try {
      const operations = await options.store.list(scope);
      if (generation !== revision || !sameScope(scope)) return;
      const visible = operations.map(({ operationId, itemId, state, errorCode }) => ({ operationId, itemId, state, ...(errorCode ? { errorCode } : {}) }));
      for (const listener of listeners) { try { listener(visible); } catch (error) { options.onError?.(error); } }
    } catch (error) { if (generation === revision && sameScope(scope)) options.onError?.(error); }
  }
  async function changed() { options.onChange?.(); await refresh(); }
  async function replay() {
    const scope = options.currentScope();
    if (!scope || !options.isOnline()) return;
    const key = JSON.stringify(scope);
    if (running?.key === key && Date.now() - running.startedAt < 30000) return running.promise;
    const promise = replayQueue({ ...options, scope, onChange: changed });
    const record = { key, promise, startedAt: Date.now() }; running = record;
    try { await promise; } finally { if (running === record) running = undefined; }
  }
  async function waitForReplay() {
    if (!options.isOnline()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([replay(), new Promise<void>(resolve => { timer = setTimeout(resolve, options.requestWaitMs ?? 8000); })]);
    } finally { if (timer) clearTimeout(timer); }
  }
  async function submit(intent: OfflineIntent, actor: UserProfile): Promise<WriteReceipt> {
    assertScope(actor);
    const op = await options.store.enqueue(actor, intent);
    assertScope(actor);
    await changed();
    if (op.state === 'pending') await waitForReplay();
    assertScope(actor);
    const current = (await options.store.list(actor)).find(candidate => candidate.operationId === op.operationId)!;
    assertScope(actor);
    return receipt(current);
  }
  async function prior(actor: UserProfile, candidate: OfflineIntent): Promise<WriteReceipt | undefined> {
    const existing = (await options.store.list(actor)).find(op => op.operationId === candidate.input.operationId);
    assertScope(actor);
    if (!existing) return;
    if (inputKey(existing.intent) !== inputKey(candidate)) invalid('Operation ID already belongs to another intent');
    return submit(existing.intent, actor);
  }
  return {
    async open(input: OpenInventoryItemInput): Promise<WriteReceipt> {
      input = { ...input };
      const actor = await options.getActor(); assertScope(actor);
      const candidate: OfflineIntent = { kind: 'open', input, catalogFingerprint: '' };
      const previous = await prior(actor, candidate); if (previous) return previous;
      const catalog = await options.loadCatalog(input.productId, input.fridgeId); assertScope(actor);
      if (!catalog) throw new InventoryError('unavailable', 'A verified catalog snapshot is required to open inventory');
      const preview = buildInventoryItem(actor, catalog.product, catalog.fridge, input);
      return submit({ ...candidate, catalogFingerprint: catalogFingerprint(catalog.product, catalog.fridge), preview: preview as unknown as Record<string, unknown> }, actor);
    },
    async close(input: CloseInventoryItemInput): Promise<WriteReceipt> {
      input = { ...input };
      const actor = await options.getActor(); assertScope(actor);
      const candidate: OfflineIntent = { kind: 'close', input };
      const previous = await prior(actor, candidate); if (previous) return previous;
      const item = await options.loadItem(input.itemId, actor); assertScope(actor);
      const preview = { ...item, ...buildClosePatch(actor, item, input) };
      return submit({ ...candidate, preview: preview as unknown as Record<string, unknown> }, actor);
    },
    replay,
    async retry(id: string) {
      const actor = await options.getActor(); assertScope(actor);
      await options.store.retry(actor, id); assertScope(actor); await changed(); await waitForReplay();
    },
    subscribe(listener: (operations: SyncOperation[]) => void): () => void {
      listeners.add(listener); listener([]); void refresh();
      return () => { listeners.delete(listener); };
    },
    scopeChanged() { revision++; for (const listener of listeners) listener([]); void refresh(); },
    refresh,
    async project(items: InventoryItem[], actor: UserProfile): Promise<InventoryItem[]> {
      const records = new Map(items.map(item => [item.id, item]));
      for (const op of await options.store.list(actor)) {
        if (op.state === 'failed' || !op.intent.preview) continue;
        const base = records.get(op.itemId);
        // Keep acknowledged state visible through a collection-cache lag. Never
        // replace a newer authoritative terminal record with an old opening.
        if (op.intent.kind === 'open' && base) continue;
        if (base && (base.finished || base.discarded || base.isThrown)) continue;
        records.set(op.itemId, normalizeItem(op.itemId, op.intent.preview));
      }
      assertScope(actor);
      return [...records.values()].filter(item => item.businessId === actor.businessId && (actor.role === 'admin' || normalizeDepartment(item.area) === actor.department));
    },
  };
}
