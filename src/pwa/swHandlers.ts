/// <reference lib="webworker" />
import {
  APP_SHELL_PATH,
  FALLBACK_PUSH,
  isOwnedObsoleteCache,
  normalizeManifest,
  NOTIFICATION_ICON,
  parsePushText,
  precacheCacheName,
  PrecacheEntry,
  routeRequest,
  safeAppUrl,
} from './swLogic';

/** The subset of the worker global used here; tests pass a fake with the same shape. */
export interface WorkerScope {
  location: { origin: string };
  caches: CacheStorage;
  registration: Pick<ServiceWorkerRegistration, 'showNotification'>;
  clients: Pick<Clients, 'matchAll' | 'openWindow' | 'claim'>;
  skipWaiting: () => Promise<void>;
  fetch: typeof fetch;
  addEventListener: (type: string, listener: (event: never) => void) => void;
}

type Waitable = { waitUntil: (p: Promise<unknown>) => void };

/**
 * Browsers refuse a redirected response as a navigation result. Some hosts redirect
 * /index.html → / (pretty URLs), so store a non-redirected copy of such responses.
 */
const cleanCopy = async (response: Response): Promise<Response> => {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

/**
 * Wire install/activate/fetch/push/notification/message handlers.
 * - Install precaches the build manifest; a missing asset fails the install (old worker stays).
 * - No automatic skipWaiting: the app asks the user, then posts SKIP_WAITING (controlled update).
 * - Activate deletes only obsolete caches this app created.
 */
export const installWorker = (
  scope: WorkerScope,
  manifest: ReadonlyArray<string | PrecacheEntry> | undefined,
) => {
  const origin = scope.location.origin;
  const entries = normalizeManifest(manifest, origin);
  const cacheName = precacheCacheName(entries);
  const precached = new Set(entries.map(e => e.url));
  const shellUrl = new URL(APP_SHELL_PATH, origin + '/').href;

  const precache = async () => {
    const cache = await scope.caches.open(cacheName);
    for (const entry of entries) {
      const response = await scope.fetch(entry.url, { cache: 'reload', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Precache failed for ${entry.url}: ${response.status}`);
      await cache.put(entry.url, await cleanCopy(response));
    }
  };

  const cleanup = async () => {
    const names = await scope.caches.keys();
    await Promise.all(names.filter(n => isOwnedObsoleteCache(n, cacheName)).map(n => scope.caches.delete(n)));
    await scope.clients.claim();
  };

  const fromPrecache = async (request: Request) => {
    const cache = await scope.caches.open(cacheName);
    const url = new URL(request.url);
    url.hash = '';
    return (await cache.match(url.href)) ?? scope.fetch(request);
  };

  const appShell = async (request: Request) => {
    try {
      return await scope.fetch(request);
    } catch (error) {
      const cache = await scope.caches.open(cacheName);
      const shell = await cache.match(shellUrl);
      if (shell) return shell;
      throw error;
    }
  };

  scope.addEventListener('install', ((event: Waitable) => {
    event.waitUntil(precache());
  }) as never);

  scope.addEventListener('activate', ((event: Waitable) => {
    event.waitUntil(cleanup());
  }) as never);

  scope.addEventListener('fetch', ((event: { request: Request; respondWith: (r: Promise<Response>) => void }) => {
    const { request } = event;
    const decision = routeRequest({ method: request.method, url: request.url, mode: request.mode }, origin, precached);
    if (decision === 'precache') event.respondWith(fromPrecache(request));
    else if (decision === 'app-shell') event.respondWith(appShell(request));
    // passthrough: do not call respondWith; the browser handles it normally.
  }) as never);

  scope.addEventListener('push', ((event: Waitable & { data?: { text: () => string } | null }) => {
    let text: string | null = null;
    try {
      text = event.data ? event.data.text() : null;
    } catch {
      text = null;
    }
    const payload = parsePushText(text) ?? FALLBACK_PUSH;
    event.waitUntil(
      scope.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        data: { url: safeAppUrl(payload.url, origin) },
        lang: 'he',
        dir: 'rtl',
      }),
    );
  }) as never);

  scope.addEventListener('notificationclick', ((event: Waitable & { notification: Notification }) => {
    event.notification.close();
    const target = safeAppUrl((event.notification.data as { url?: unknown } | null)?.url, origin);
    event.waitUntil(
      (async () => {
        const windows = (await scope.clients.matchAll({ type: 'window', includeUncontrolled: true })) as WindowClient[];
        const existing = windows.find(c => {
          try {
            return new URL(c.url).origin === origin;
          } catch {
            return false;
          }
        });
        if (existing) {
          const focused = await existing.focus();
          if (focused.url !== target && 'navigate' in focused) await focused.navigate(target);
          return;
        }
        await scope.clients.openWindow(target);
      })(),
    );
  }) as never);

  scope.addEventListener('message', ((event: { data?: unknown }) => {
    if ((event.data as { type?: unknown } | null)?.type === 'SKIP_WAITING') {
      void scope.skipWaiting();
    }
  }) as never);

  return { cacheName, entries };
};
