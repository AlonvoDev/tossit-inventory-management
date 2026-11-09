import type { Fridge } from '../types/Fridge';
import type { Product } from '../types/Product';
import type { WriteReceipt } from '../domain/contracts';
import { InventoryError } from '../domain/errors';
import { normalizeDepartment } from '../domain/normalizeItem';
import type { OfflineIntent, OfflineScope, QueueStore } from './queueStore';

/** Only configuration that affects an opened batch; display codes are not identity. */
export function catalogFingerprint(product: Product, fridge?: Fridge): string {
  return JSON.stringify([product.id, product.businessId, normalizeDepartment(product.area), product.name,
    product.type, product.shelfLifeDays, product.fridgeId ?? null,
    fridge?.id ?? null, fridge?.businessId ?? null, normalizeDepartment(fridge?.department)]);
}
export interface ReplayOptions {
  store: QueueStore;
  scope: OfflineScope;
  currentScope(): OfflineScope | null;
  isOnline(): boolean;
  /** Verify a previous real server write before consulting mutable catalog configuration. */
  lookupAcknowledgement(intent: OfflineIntent, scope: OfflineScope): Promise<WriteReceipt | null>;
  loadCatalog(productId: string, fridgeId?: string): Promise<{ product: Product; fridge?: Fridge } | null>;
  /** Must additionally bind the online write to this scope across its own awaits. */
  execute(intent: OfflineIntent, scope: OfflineScope): Promise<WriteReceipt>;
  onChange?(): void | Promise<void>;
  now?(): number;
  token?(): string;
  leaseMs?: number;
  maxOperations?: number;
}
function errorCode(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code.split('/').pop()! : 'unknown';
}
/** Drain only the current account's queue. Each claim has a fresh fencing token. */
export async function replayQueue(options: ReplayOptions): Promise<void> {
  const { store } = options;
  const scope = { ...options.scope };
  const now = options.now ?? Date.now;
  const validSession = () => {
    const current = options.currentScope();
    return options.isOnline() && current?.uid === scope.uid && current.businessId === scope.businessId;
  };
  const notify = async () => { if (validSession()) { try { await options.onChange?.(); } catch { /* UI observation cannot change a durable acknowledgement. */ } } };
  const acknowledged = async (result: WriteReceipt, op: { operationId: string; itemId: string }, token: string) => {
    if (result.state !== 'synced' || result.operationId !== op.operationId || result.itemId !== op.itemId) throw new InventoryError('invalid-input', 'Replay did not receive a matching server acknowledgement');
    const settled = await store.settle(scope, op.operationId, token, 'synced');
    if (settled) await notify();
    return settled;
  };
  for (let count = 0; count < (options.maxOperations ?? 1000) && validSession(); count++) {
    const token = options.token?.() ?? crypto.randomUUID();
    const op = await store.claimNext(scope, token, now(), options.leaseMs);
    if (!op) return;
    if (!validSession()) { await store.release(scope, op.operationId, token); return; }
    try {
      const prior = await options.lookupAcknowledgement(op.intent, scope);
      if (!validSession()) { await store.release(scope, op.operationId, token); return; }
      if (prior) {
        if (!await acknowledged(prior, op, token)) return;
        continue;
      }
      if (op.intent.kind === 'open') {
        const catalog = await options.loadCatalog(op.intent.input.productId, op.intent.input.fridgeId);
        if (!validSession()) { await store.release(scope, op.operationId, token); return; }
        if (!catalog || catalogFingerprint(catalog.product, catalog.fridge) !== op.intent.catalogFingerprint) {
          throw new InventoryError('catalog-changed', 'Catalog changed while this opening was offline; review the original intent');
        }
      }
      const result = await options.execute(op.intent, scope);
      if (!validSession()) { await store.release(scope, op.operationId, token); return; }
      if (!await acknowledged(result, op, token)) return;
    } catch (error) {
      const code = errorCode(error);
      if (!validSession() || ['unavailable', 'deadline-exceeded', 'aborted', 'cancelled', 'network-request-failed', 'unauthenticated'].includes(code)) {
        await store.release(scope, op.operationId, token, code);
        await notify(); return; // Back off until another connectivity/session trigger.
      }
      if (!await store.settle(scope, op.operationId, token, 'failed', code)) return;
      await notify(); // Retain conflicts; never rewrite the original opening/catalog.
    }
  }
}
