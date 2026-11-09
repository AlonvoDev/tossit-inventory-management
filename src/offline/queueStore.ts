import type { CloseInventoryItemInput, OpenInventoryItemInput, SyncOperation } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';

export interface OfflineScope { uid: string; businessId: string }
export type OfflineIntent =
  | { kind: 'open'; input: OpenInventoryItemInput; catalogFingerprint: string }
  | { kind: 'close'; input: CloseInventoryItemInput };
export interface StoredOperation extends SyncOperation {
  key: string;
  scope: string;
  owner: OfflineScope;
  intent: OfflineIntent;
  fingerprint: string;
  createdAt: number;
  sequence: number;
  attempts: number;
  lease?: { token: string; until: number };
}
export interface LegacyReview {
  key: string; sourceKey: string; raw: string; status: 'corrupt' | 'unattributed'; detectedAt: number;
}
export interface QueueStore {
  enqueue(scope: OfflineScope, intent: OfflineIntent): Promise<StoredOperation>;
  list(scope: OfflineScope): Promise<StoredOperation[]>;
  claimNext(scope: OfflineScope, token: string, now: number, leaseMs?: number): Promise<StoredOperation | null>;
  settle(scope: OfflineScope, id: string, token: string, state: 'synced' | 'failed', errorCode?: string): Promise<boolean>;
  release(scope: OfflineScope, id: string, token: string, errorCode?: string): Promise<boolean>;
  retry(scope: OfflineScope, id: string): Promise<void>;
  putCache(scope: OfflineScope, name: string, value: unknown): Promise<void>;
  getCache<T = unknown>(scope: OfflineScope, name: string): Promise<T | undefined>;
  quarantineLegacy(values: { sourceKey: string; raw: string }[]): Promise<void>;
  listLegacyReviews(): Promise<LegacyReview[]>;
  close(): Promise<void>;
}
const operations = 'operations';
function scopeKey(scope: OfflineScope): string {
  if (!scope.uid?.trim() || !scope.businessId?.trim()) invalid('An explicit offline account and business are required');
  return JSON.stringify([scope.uid, scope.businessId]);
}
function keyFor(scope: OfflineScope, id: string) { return JSON.stringify([scopeKey(scope), id]); }
/** JSON cache representation handles Firestore Timestamp.toJSON and rejects lossy numeric values. */
function serialized<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value, (_key, entry) => {
      if (typeof entry === 'number' && !Number.isFinite(entry)) invalid('Cannot persist a non-finite offline value');
      if (typeof entry === 'function' || typeof entry === 'symbol' || typeof entry === 'bigint') invalid('Unsupported offline value');
      return entry;
    })) as T;
  } catch (error) {
    if (error instanceof InventoryError) throw error;
    return invalid('Offline value is not serializable');
  }
}
function fingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${JSON.stringify(key)}:${fingerprint(value)}`).join(',')}}`;
  return JSON.stringify(value);
}
function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
function validateIntent(intent: OfflineIntent) {
  const input = intent?.input;
  if (!input || !/^[A-Za-z0-9_-]{8,80}$/.test(input.operationId)) invalid('Invalid offline operation ID');
  if (intent.kind === 'open') {
    if (!intent.input.productId || intent.input.productId.includes('/') || !Number.isFinite(intent.input.amount) || intent.input.amount <= 0 || !Number.isSafeInteger(intent.input.openedAtMs) || !intent.catalogFingerprint) invalid('Invalid offline opening payload');
  } else if (intent.kind === 'close') {
    if (!intent.input.itemId || intent.input.itemId.includes('/') || !['finished', 'discarded'].includes(intent.input.action)) invalid('Invalid offline close payload');
    if (intent.input.action === 'discarded' && (!Number.isFinite(intent.input.discardedAmount) || intent.input.discardedAmount! <= 0 || !['expired', 'damaged', 'other'].includes(intent.input.reason ?? ''))) invalid('Invalid offline discard payload');
    if (intent.input.action === 'finished' && (intent.input.discardedAmount !== undefined || intent.input.reason !== undefined)) invalid('Finished operation cannot contain discard data');
  } else invalid('Unknown offline operation kind');
}
/** One durable database, with every normal cache/queue key explicitly account/business scoped. */
export function createQueueStore(databaseName = 'tossit-offline-v1'): QueueStore {
  let connection: Promise<IDBDatabase> | undefined;
  function database(): Promise<IDBDatabase> {
    if (!connection) connection = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new InventoryError('unavailable', 'Durable offline storage is unavailable')); return; }
      const opening = indexedDB.open(databaseName, 1);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        db.createObjectStore(operations, { keyPath: 'key' }).createIndex('scope', 'scope');
        db.createObjectStore('cache', { keyPath: 'key' });
        db.createObjectStore('legacy', { keyPath: 'key' });
        db.createObjectStore('meta');
      };
      opening.onsuccess = () => { const db = opening.result; db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
      opening.onerror = () => { connection = undefined; reject(opening.error); };
      opening.onblocked = () => { connection = undefined; reject(new InventoryError('unavailable', 'Close older TossIt tabs to open durable storage')); };
    });
    return connection;
  }
  async function transaction<T>(stores: string | string[], mode: IDBTransactionMode, run: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    const db = await database();
    const tx = db.transaction(stores, mode);
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new InventoryError('unavailable', 'Offline storage transaction was aborted')); tx.onerror = () => undefined;
    });
    try { const result = await run(tx); await completed; return result; }
    catch (error) { try { tx.abort(); } catch { /* Already committed or aborted. */ } await completed.catch(() => undefined); throw error; }
  }
  async function leasedChange(scope: OfflineScope, id: string, token: string, apply: (op: StoredOperation) => void): Promise<boolean> {
    return transaction(operations, 'readwrite', async tx => {
      const table = tx.objectStore(operations);
      const op = await request(table.get(keyFor(scope, id))) as StoredOperation | undefined;
      if (!op || op.state !== 'pending' || op.lease?.token !== token) return false;
      apply(op); delete op.lease; await request(table.put(op)); return true;
    });
  }
  return {
    async enqueue(scope, original) {
      validateIntent(original);
      const intent = serialized(original);
      const digest = fingerprint(intent);
      const key = keyFor(scope, intent.input.operationId);
      return transaction([operations, 'meta'], 'readwrite', async tx => {
        const table = tx.objectStore(operations);
        const previous = await request(table.get(key)) as StoredOperation | undefined;
        if (previous) {
          if (previous.fingerprint !== digest) invalid('Operation ID already belongs to another offline intent');
          return previous;
        }
        const meta = tx.objectStore('meta');
        const sequence = ((await request(meta.get('sequence'))) as number | undefined ?? 0) + 1;
        await request(meta.put(sequence, 'sequence'));
        const op: StoredOperation = {
          key, scope: scopeKey(scope), owner: { ...scope }, intent, fingerprint: digest,
          operationId: intent.input.operationId, itemId: intent.kind === 'open' ? intent.input.operationId : intent.input.itemId,
          state: 'pending', createdAt: Date.now(), sequence, attempts: 0,
        };
        await request(table.add(op)); return op;
      });
    },
    async list(scope) {
      return transaction(operations, 'readonly', async tx => {
        const records = await request(tx.objectStore(operations).index('scope').getAll(scopeKey(scope))) as StoredOperation[];
        return records.sort((a, b) => a.sequence - b.sequence);
      });
    },
    async claimNext(scope, token, now, leaseMs = 30000) {
      if (!token || !Number.isFinite(now) || !Number.isFinite(leaseMs) || leaseMs <= 0) invalid('Invalid replay lease');
      return transaction(operations, 'readwrite', async tx => {
        const table = tx.objectStore(operations);
        const records = await request(table.index('scope').getAll(scopeKey(scope))) as StoredOperation[];
        const pending = records.filter(op => op.state === 'pending').sort((a, b) => a.sequence - b.sequence);
        // Preserve operation order: a leased earlier intent blocks later intents.
        const op = pending[0];
        if (!op || (op.lease && op.lease.until > now)) return null;
        op.lease = { token, until: now + leaseMs }; op.attempts++;
        await request(table.put(op)); return op;
      });
    },
    settle: (scope, id, token, state, errorCode) => leasedChange(scope, id, token, op => {
      op.state = state; if (errorCode) op.errorCode = errorCode; else delete op.errorCode;
    }),
    release: (scope, id, token, errorCode) => leasedChange(scope, id, token, op => {
      if (errorCode) op.errorCode = errorCode; else delete op.errorCode;
    }),
    async retry(scope, id) {
      await transaction(operations, 'readwrite', async tx => {
        const table = tx.objectStore(operations);
        const op = await request(table.get(keyFor(scope, id))) as StoredOperation | undefined;
        if (!op) throw new InventoryError('not-found', 'Offline operation not found');
        if (op.state === 'failed') { op.state = 'pending'; delete op.errorCode; delete op.lease; await request(table.put(op)); }
      });
    },
    async putCache(scope, name, value) {
      const record = { key: keyFor(scope, name), value: serialized(value), savedAt: Date.now() };
      await transaction('cache', 'readwrite', async tx => { await request(tx.objectStore('cache').put(record)); });
    },
    async getCache<T>(scope: OfflineScope, name: string): Promise<T | undefined> {
      return transaction('cache', 'readonly', async tx => {
        const record = await request(tx.objectStore('cache').get(keyFor(scope, name))) as { value: T } | undefined;
        return record?.value;
      });
    },
    async quarantineLegacy(values) {
      await transaction('legacy', 'readwrite', async tx => {
        const table = tx.objectStore('legacy');
        for (const { sourceKey, raw } of values) {
          const key = JSON.stringify([sourceKey, raw]);
          if (await request(table.getKey(key))) continue;
          let status: LegacyReview['status'] = 'unattributed';
          try { JSON.parse(raw); } catch { status = 'corrupt'; }
          await request(table.add({ key, sourceKey, raw, status, detectedAt: Date.now() } satisfies LegacyReview));
        }
      });
    },
    async listLegacyReviews() { return transaction('legacy', 'readonly', tx => request(tx.objectStore('legacy').getAll())); },
    async close() { const existing = connection; connection = undefined; if (existing) (await existing).close(); },
  };
}
