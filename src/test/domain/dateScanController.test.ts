import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDateScanController } from '../../features/dateScan/controller';
import type { DateScanRequest, ScanContext } from '../../features/dateScan/controller';

const output = (source = 'packaging') => ({ version: 1, source, outcome: 'candidates', candidates: [{
  id: 'candidate-1', rawText: '28.11.2026', meaning: 'manufacturer-expiry',
  reading: { precision: 'day', date: { year: 2026, month: 11, day: 28 } }, issues: [],
}] });
const image = () => new Blob(['synthetic-image-bytes'], { type: 'image/jpeg' });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  let context: ScanContext | null = { uid: 'u1', businessId: 'b1' };
  let online = true;
  let sequence = 0;
  const calls: Array<{ request: DateScanRequest; signal: AbortSignal; response: ReturnType<typeof deferred<unknown>> }> = [];
  const controller = createDateScanController({
    currentContext: () => context,
    isOnline: () => online,
    requestId: () => `scan-request-${++sequence}`,
    timeoutMs: 1000,
    extract: (request, signal) => {
      const response = deferred<unknown>(); calls.push({ request, signal, response }); return response.promise;
    },
  });
  return { controller, calls, setContext: (value: ScanContext | null) => { context = value; }, setOnline: (value: boolean) => { online = value; } };
}
afterEach(() => vi.useRealTimers());

describe('date scan orchestration without a provider', () => {
  it('validates a result against the captured source and never confirms or submits it', async () => {
    const x = setup();
    const task = x.controller.start('packaging', image());
    expect(x.controller.getSnapshot()).toEqual({ phase: 'scanning', requestId: 'scan-request-1' });
    expect(x.calls[0].request).toMatchObject({ expectedActorUid: 'u1', expectedBusinessId: 'b1', source: 'packaging' });
    x.calls[0].response.resolve(output()); await task;
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'ready', result: { source: 'packaging' } });
    expect(JSON.stringify(x.controller.getSnapshot())).not.toContain('confirmed');
    expect(x.controller.getSnapshot()).not.toHaveProperty('image');
  });

  it('does not call extraction without an account or connection', async () => {
    const x = setup(); x.setContext(null);
    await x.controller.start('packaging', image());
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'unauthenticated' });
    x.setContext({ uid: 'u1', businessId: 'b1' }); x.setOnline(false);
    await x.controller.start('packaging', image());
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'offline' });
    expect(x.calls).toHaveLength(0);
  });

  it.each([
    [() => new Blob([], { type: 'image/jpeg' }), 'invalid-image'],
    [() => new Blob(['bytes'], { type: 'image/heic' }), 'unsupported-image'],
    [() => new Blob(['bytes'], { type: 'text/html' }), 'unsupported-image'],
    [() => new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/png' }), 'image-too-large'],
  ] as const)('rejects invalid input before transport (%s)', async (makeImage, code) => {
    const x = setup(); await x.controller.start('packaging', makeImage());
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code });
    expect(x.calls).toHaveLength(0);
  });

  it('cancels immediately even if extraction ignores abort, and ignores its late response', async () => {
    const x = setup(); const task = x.controller.start('packaging', image());
    x.controller.cancel(); await task;
    expect(x.calls[0].signal.aborted).toBe(true);
    expect(x.controller.getSnapshot()).toEqual({ phase: 'idle' });
    x.calls[0].response.resolve(output()); await Promise.resolve();
    expect(x.controller.getSnapshot()).toEqual({ phase: 'idle' });
  });

  it('a replacement photo/source cannot be overwritten by the previous response', async () => {
    const x = setup(); const first = x.controller.start('packaging', image());
    const second = x.controller.start('staff-label', image());
    await first;
    expect(x.calls[0].signal.aborted).toBe(true);
    x.calls[0].response.resolve(output()); await Promise.resolve();
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'scanning', requestId: 'scan-request-2' });
    x.calls[1].response.resolve(output('staff-label')); await second;
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'ready', requestId: 'scan-request-2', result: { source: 'staff-label' } });
  });

  it.each([{ uid: 'u2', businessId: 'b1' }, { uid: 'u1', businessId: 'b2' }, null])('does not expose a result after account/business changes to %j', async context => {
    const x = setup(); const task = x.controller.start('packaging', image());
    x.setContext(context); x.calls[0].response.resolve(output()); await task;
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'context-changed' });
    expect(x.controller.getSnapshot()).not.toHaveProperty('result');
  });

  it('refreshing account context clears already displayed results', async () => {
    const x = setup(); const task = x.controller.start('packaging', image());
    x.calls[0].response.resolve(output()); await task;
    x.setContext({ uid: 'u2', businessId: 'b1' }); x.controller.refreshContext();
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'context-changed' });
  });

  it('disconnecting aborts the current request without automatically retrying on reconnect', async () => {
    const x = setup(); const task = x.controller.start('packaging', image());
    x.setOnline(false); x.controller.refreshContext(); await task;
    expect(x.calls[0].signal.aborted).toBe(true);
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'offline' });
    x.setOnline(true); x.controller.refreshContext(); expect(x.calls).toHaveLength(1);
  });

  it('times out and ignores late completion without retaining the image', async () => {
    vi.useFakeTimers();
    const x = setup(); const task = x.controller.start('packaging', image());
    await vi.advanceTimersByTimeAsync(1000); await task;
    expect(x.calls[0].signal.aborted).toBe(true);
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'timeout' });
    x.calls[0].response.resolve(output()); await Promise.resolve();
    expect(x.controller.getSnapshot()).not.toHaveProperty('result');
  });

  it('maps malformed/mismatched results and provider failures to bounded error codes', async () => {
    const x = setup(); let task = x.controller.start('packaging', image());
    x.calls[0].response.resolve(output('staff-label')); await task;
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'invalid-result' });
    task = x.controller.start('packaging', image());
    x.calls[1].response.reject(new Error('PRIVATE_TOKEN_AND_IMAGE_TEXT')); await task;
    expect(x.controller.getSnapshot()).toMatchObject({ phase: 'error', code: 'unavailable' });
    expect(JSON.stringify(x.controller.getSnapshot())).not.toContain('PRIVATE');
  });

  it('disposing aborts pending work and prevents notifications or reuse after unmount', async () => {
    const x = setup(); const listener = vi.fn(); x.controller.subscribe(listener);
    const task = x.controller.start('packaging', image()); listener.mockClear();
    x.controller.dispose(); await task;
    x.calls[0].response.resolve(output()); await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    expect(x.calls[0].signal.aborted).toBe(true);
    expect(x.controller.getSnapshot()).toEqual({ phase: 'idle' });
    await expect(x.controller.start('packaging', image())).rejects.toThrow('disposed');
  });

  it('does not start transport if a subscriber cancels during the scanning notification', async () => {
    const x = setup();
    x.controller.subscribe(() => { if (x.controller.getSnapshot().phase === 'scanning') x.controller.cancel(); });
    await x.controller.start('packaging', image());
    expect(x.calls).toHaveLength(0);
    expect(x.controller.getSnapshot()).toEqual({ phase: 'idle' });
  });

  it('contains a synchronous transport failure and removes its deadline timer', async () => {
    vi.useFakeTimers();
    const controller = createDateScanController({
      currentContext: () => ({ uid: 'u1', businessId: 'b1' }), isOnline: () => true,
      requestId: () => 'scan-request-1', extract: () => { throw new Error('SECRET'); },
    });
    await controller.start('packaging', image());
    expect(controller.getSnapshot()).toEqual({ phase: 'error', code: 'unavailable' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rechecks context before sending when an observer changes the active account', async () => {
    const x = setup();
    x.controller.subscribe(() => {
      if (x.controller.getSnapshot().phase === 'scanning') x.setContext({ uid: 'u2', businessId: 'b1' });
    });
    await x.controller.start('packaging', image());
    expect(x.calls).toHaveLength(0);
    expect(x.controller.getSnapshot()).toEqual({ phase: 'error', code: 'context-changed' });
  });
});
