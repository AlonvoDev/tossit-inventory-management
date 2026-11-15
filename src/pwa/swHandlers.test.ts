import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installWorker, WorkerScope } from './swHandlers';

const ORIGIN = 'https://tossit.example';

/** Minimal in-memory CacheStorage. */
const makeCaches = () => {
  const store = new Map<string, Map<string, Response>>();
  const caches = {
    open: vi.fn(async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      const m = store.get(name)!;
      return {
        put: async (url: string, res: Response) => void m.set(url, res),
        match: async (url: string) => m.get(url)?.clone(),
      };
    }),
    keys: vi.fn(async () => [...store.keys()]),
    delete: vi.fn(async (name: string) => store.delete(name)),
  };
  return { store, caches };
};

const makeScope = (fetchImpl: (url: string) => Promise<Response>) => {
  const listeners = new Map<string, (e: unknown) => void>();
  const { store, caches } = makeCaches();
  const windowClient = {
    url: `${ORIGIN}/dashboard`,
    focus: vi.fn(async function (this: unknown) {
      return windowClient;
    }),
    navigate: vi.fn(async () => windowClient),
  };
  const scope = {
    location: { origin: ORIGIN },
    caches,
    registration: { showNotification: vi.fn(async () => undefined) },
    clients: {
      matchAll: vi.fn(async () => [] as unknown[]),
      openWindow: vi.fn(async () => null),
      claim: vi.fn(async () => undefined),
    },
    skipWaiting: vi.fn(async () => undefined),
    fetch: vi.fn((input: RequestInfo | URL) => fetchImpl(typeof input === 'string' ? input : (input as Request).url)),
    addEventListener: (type: string, l: (e: never) => void) => listeners.set(type, l as (e: unknown) => void),
  };
  const dispatch = async (type: string, event: Record<string, unknown>) => {
    const pending: Promise<unknown>[] = [];
    let responded: Promise<Response> | undefined;
    listeners.get(type)!({
      ...event,
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      respondWith: (p: Promise<Response>) => (responded = p),
    });
    await Promise.all(pending);
    return responded;
  };
  return { scope: scope as unknown as WorkerScope & typeof scope, dispatch, store, windowClient };
};

const manifest = [
  { url: 'index.html', revision: 'r1' },
  { url: 'assets/app-1.js', revision: null },
];

const ok = (body: string) => Promise.resolve(new Response(body, { status: 200 }));

describe('worker lifecycle', () => {
  it('precaches the manifest on install and does not skip waiting by itself', async () => {
    const { scope, dispatch, store } = makeScope(url => ok(`body:${url}`));
    const { cacheName } = installWorker(scope, manifest);
    await dispatch('install', {});
    expect([...store.get(cacheName)!.keys()]).toEqual([`${ORIGIN}/index.html`, `${ORIGIN}/assets/app-1.js`]);
    expect(scope.skipWaiting).not.toHaveBeenCalled();
  });

  it('fails the install when a precache asset is missing (old worker keeps serving)', async () => {
    const { scope, dispatch } = makeScope(url =>
      url.endsWith('app-1.js') ? Promise.resolve(new Response('nf', { status: 404 })) : ok('x'),
    );
    installWorker(scope, manifest);
    await expect(dispatch('install', {})).rejects.toThrow(/Precache failed/);
  });

  it('activates by deleting only obsolete caches it owns', async () => {
    const { scope, dispatch, store } = makeScope(() => ok('x'));
    const { cacheName } = installWorker(scope, manifest);
    for (const name of ['tossit-precache-00000000', 'tossit-cache-v1', 'firebase-heartbeat-database', cacheName]) {
      await scope.caches.open(name);
    }
    await dispatch('activate', {});
    expect([...store.keys()].sort()).toEqual([cacheName, 'firebase-heartbeat-database'].sort());
    expect(scope.clients.claim).toHaveBeenCalled();
  });

  it('skips waiting only when the page asks', async () => {
    const { scope, dispatch } = makeScope(() => ok('x'));
    installWorker(scope, manifest);
    await dispatch('message', { data: { type: 'OTHER' } });
    expect(scope.skipWaiting).not.toHaveBeenCalled();
    await dispatch('message', { data: { type: 'SKIP_WAITING' } });
    expect(scope.skipWaiting).toHaveBeenCalledTimes(1);
  });
});

describe('fetch routing', () => {
  let ctx: ReturnType<typeof makeScope>;
  beforeEach(async () => {
    ctx = makeScope(url => ok(`net:${url}`));
    installWorker(ctx.scope, manifest);
    await ctx.dispatch('install', {});
    ctx.scope.fetch.mockClear();
  });

  it('serves precached assets from cache without the network', async () => {
    const res = await ctx.dispatch('fetch', { request: new Request(`${ORIGIN}/assets/app-1.js`) });
    expect(await res!.text()).toBe(`net:${ORIGIN}/assets/app-1.js`);
    expect(ctx.scope.fetch).not.toHaveBeenCalled();
  });

  it('falls back to the cached app shell for offline navigations', async () => {
    ctx.scope.fetch.mockImplementation(() => Promise.reject(new TypeError('offline')));
    const request = { url: `${ORIGIN}/admin/users`, method: 'GET', mode: 'navigate' } as Request;
    const res = await ctx.dispatch('fetch', { request });
    expect(await res!.text()).toBe(`net:${ORIGIN}/index.html`);
  });

  it('stores redirected precache responses as clean copies (hosts that redirect /index.html)', async () => {
    const redirectCtx = makeScope(url => {
      const res = new Response(`net:${url}`, { status: 200 });
      Object.defineProperty(res, 'redirected', { value: url.endsWith('index.html') });
      return Promise.resolve(res);
    });
    const { cacheName } = installWorker(redirectCtx.scope, manifest);
    await redirectCtx.dispatch('install', {});
    const stored = redirectCtx.store.get(cacheName)!.get(`${ORIGIN}/index.html`)!;
    expect(stored.redirected).toBe(false);
    expect(await stored.clone().text()).toBe(`net:${ORIGIN}/index.html`);
  });

  it('does not intercept API requests', async () => {
    const res = await ctx.dispatch('fetch', {
      request: new Request('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/items'),
    });
    expect(res).toBeUndefined();
  });
});

describe('push and notification click', () => {
  const pushEvent = (text: string | null) => ({ data: text === null ? null : { text: () => text } });

  it('shows a valid payload with a same-origin URL', async () => {
    const { scope, dispatch } = makeScope(() => ok('x'));
    installWorker(scope, manifest);
    await dispatch(
      'push',
      pushEvent(JSON.stringify({ version: 1, title: 'תזכורת', body: 'יש פריטים פגי תוקף', url: '/dashboard?area=bar', tag: 't1' })),
    );
    expect(scope.registration.showNotification).toHaveBeenCalledWith(
      'תזכורת',
      expect.objectContaining({ body: 'יש פריטים פגי תוקף', tag: 't1', data: { url: `${ORIGIN}/dashboard?area=bar` } }),
    );
  });

  it.each([['malformed JSON', '{bad'], ['wrong schema', JSON.stringify({ title: 'x' })], ['no data', null]])(
    'shows a generic notification for %s',
    async (_, text) => {
      const { scope, dispatch } = makeScope(() => ok('x'));
      installWorker(scope, manifest);
      await dispatch('push', pushEvent(text));
      expect(scope.registration.showNotification).toHaveBeenCalledWith(
        'TossIt',
        expect.objectContaining({ tag: 'tossit-generic', data: { url: `${ORIGIN}/dashboard` } }),
      );
    },
  );

  it('rewrites a foreign URL in a payload to the dashboard', async () => {
    const { scope, dispatch } = makeScope(() => ok('x'));
    installWorker(scope, manifest);
    await dispatch('push', pushEvent(JSON.stringify({ version: 1, title: 'a', body: 'b', url: 'https://evil.example', tag: 't' })));
    expect(scope.registration.showNotification).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ data: { url: `${ORIGIN}/dashboard` } }),
    );
  });

  it('click focuses an open app window and navigates it', async () => {
    const { scope, dispatch, windowClient } = makeScope(() => ok('x'));
    scope.clients.matchAll.mockResolvedValue([windowClient]);
    installWorker(scope, manifest);
    const close = vi.fn();
    await dispatch('notificationclick', { notification: { close, data: { url: `${ORIGIN}/admin?tab=reports` } } });
    expect(close).toHaveBeenCalled();
    expect(windowClient.focus).toHaveBeenCalled();
    expect(windowClient.navigate).toHaveBeenCalledWith(`${ORIGIN}/admin?tab=reports`);
    expect(scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it('click opens only same-origin paths when no window is open', async () => {
    const { scope, dispatch } = makeScope(() => ok('x'));
    installWorker(scope, manifest);
    await dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://evil.example/x' } } });
    expect(scope.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/dashboard`);
  });
});
