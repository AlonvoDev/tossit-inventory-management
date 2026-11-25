import type { DateScanResult } from '../../domain/dateEvidence';
import { parseDateScanResult } from '../../domain/dateScanReview';

export interface ScanContext { uid: string; businessId: string }
export interface DateScanRequest {
  requestId: string;
  source: DateScanResult['source'];
  image: Blob;
  expectedActorUid: string;
  expectedBusinessId: string;
}
export type ScanRequestErrorCode = 'unauthenticated' | 'offline' | 'invalid-image' | 'unsupported-image'
  | 'image-too-large' | 'timeout' | 'unavailable' | 'invalid-result' | 'context-changed';
export type DateScanState =
  | { phase: 'idle' }
  | { phase: 'scanning'; requestId: string }
  | { phase: 'ready'; requestId: string; result: DateScanResult }
  | { phase: 'error'; code: ScanRequestErrorCode };
export interface DateScanControllerOptions {
  currentContext(): ScanContext | null;
  isOnline(): boolean;
  /** Transport must verify Auth and expected scope server-side; these fields are not authority. */
  extract(request: DateScanRequest, signal: AbortSignal): Promise<unknown>;
  requestId?(): string;
  timeoutMs?: number;
}
export const MAX_SCAN_IMAGE_BYTES = 2 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

/** Local lifecycle only: no provider, storage, confirmation or inventory write is installed here. */
export function createDateScanController(options: DateScanControllerOptions) {
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) throw new Error('Invalid scan timeout');
  let snapshot: DateScanState = { phase: 'idle' };
  let generation = 0, disposed = false;
  let resultContext: ScanContext | null = null;
  let active: { generation: number; context: ScanContext; abort: AbortController } | undefined;
  const listeners = new Set<() => void>();
  const sameContext = (context: ScanContext) => {
    const current = options.currentContext();
    return current?.uid === context.uid && current.businessId === context.businessId;
  };
  function publish(next: DateScanState) {
    snapshot = next;
    if (!disposed) for (const listener of listeners) {
      try { listener(); } catch { /* Subscriber failures must not interrupt cancellation/cleanup. */ }
    }
  }
  function stop() {
    ++generation;
    const previous = active; active = undefined;
    resultContext = null;
    previous?.abort.abort();
  }
  function invalidate(code: ScanRequestErrorCode) { stop(); publish({ phase: 'error', code }); }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      if (disposed) throw new Error('Date scan controller is disposed');
      listeners.add(listener); return () => { listeners.delete(listener); };
    },
    cancel() { stop(); publish({ phase: 'idle' }); },
    /** Call on auth/business/online changes, including after a ready result is displayed. */
    refreshContext() {
      if (disposed) return;
      const context = active?.context ?? resultContext;
      if (context && !sameContext(context)) invalidate('context-changed');
      else if (active && !options.isOnline()) invalidate('offline');
    },
    dispose() { disposed = true; listeners.clear(); stop(); snapshot = { phase: 'idle' }; },
    async start(source: DateScanResult['source'], image: Blob): Promise<void> {
      if (disposed) throw new Error('Date scan controller is disposed');
      stop();
      const current = options.currentContext();
      if (!current || typeof current.uid !== 'string' || !current.uid.trim()
          || typeof current.businessId !== 'string' || !current.businessId.trim()) return publish({ phase: 'error', code: 'unauthenticated' });
      if (!options.isOnline()) return publish({ phase: 'error', code: 'offline' });
      if (!['packaging', 'staff-label'].includes(source) || !(image instanceof Blob) || image.size === 0) return publish({ phase: 'error', code: 'invalid-image' });
      if (!allowedTypes.includes(image.type)) return publish({ phase: 'error', code: 'unsupported-image' });
      if (image.size > MAX_SCAN_IMAGE_BYTES) return publish({ phase: 'error', code: 'image-too-large' });
      const context = { uid: current.uid, businessId: current.businessId };
      let requestId: string;
      try { requestId = (options.requestId ?? (() => crypto.randomUUID()))(); }
      catch { return publish({ phase: 'error', code: 'unavailable' }); }
      if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) return publish({ phase: 'error', code: 'unavailable' });
      const run = { generation, context, abort: new AbortController() };
      active = run;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelled: (() => void) | undefined;
      let timedOut = false;
      const cancellation = new Promise<never>((_, reject) => {
        cancelled = () => reject(new Error('Scan cancelled'));
        run.abort.signal.addEventListener('abort', cancelled, { once: true });
        timer = setTimeout(() => { timedOut = true; run.abort.abort(); }, timeoutMs);
      });
      // A subscriber or synchronously throwing transport can cancel before Promise.race attaches.
      void cancellation.catch(() => undefined);
      publish({ phase: 'scanning', requestId });
      try {
        if (active !== run || generation !== run.generation || disposed) return;
        if (!sameContext(context)) return invalidate('context-changed');
        if (!options.isOnline()) return invalidate('offline');
        const extraction = run.abort.signal.aborted
          ? Promise.reject(new Error('Scan cancelled'))
          : options.extract({ requestId, source, image, expectedActorUid: context.uid, expectedBusinessId: context.businessId }, run.abort.signal);
        const result = await Promise.race([
          extraction,
          cancellation,
        ]);
        if (active !== run || generation !== run.generation || disposed) return;
        if (!sameContext(context)) return invalidate('context-changed');
        if (!options.isOnline()) return invalidate('offline');
        let parsed: DateScanResult;
        try { parsed = parseDateScanResult(result, source); }
        catch { return publish({ phase: 'error', code: 'invalid-result' }); }
        resultContext = context;
        publish({ phase: 'ready', requestId, result: parsed });
      } catch {
        if (active !== run || generation !== run.generation || disposed) return;
        if (!sameContext(context)) return invalidate('context-changed');
        if (!options.isOnline()) return invalidate('offline');
        publish({ phase: 'error', code: timedOut ? 'timeout' : 'unavailable' });
      } finally {
        clearTimeout(timer);
        if (cancelled) run.abort.signal.removeEventListener('abort', cancelled);
        if (active === run) active = undefined;
      }
    },
  };
}
