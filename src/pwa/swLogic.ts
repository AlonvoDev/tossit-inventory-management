/**
 * Pure service-worker rules (U4). Kept free of worker globals so they can be unit tested.
 *
 * Cache policy: only the build's own public assets (the precache manifest) are cached.
 * API/Firestore traffic is cross-origin and never touched; no response from another user's
 * data is ever stored by this worker.
 */

// Shared contract type; the runtime parser below stays because push data is untrusted.
import type { PushPayload } from '../domain/contracts';
export type { PushPayload };

export interface PrecacheEntry {
  url: string;
  revision: string | null;
}

export const PRECACHE_PREFIX = 'tossit-precache-';
export const DEFAULT_APP_PATH = '/dashboard';
export const APP_SHELL_PATH = '/index.html';
export const NOTIFICATION_ICON = '/icons/icon-192.png';

/** Caches created by earlier TossIt workers. Only these, and older precaches of ours, are deleted. */
export const LEGACY_CACHE_NAMES: readonly string[] = [
  'tossit-cache-v1', // hand-written public/service-worker.js
  'images-cache', // previous generateSW runtime caches
  'google-fonts-cache',
  'gstatic-fonts-cache',
];

export const isOwnedObsoleteCache = (name: string, current: string): boolean =>
  name !== current &&
  (name.startsWith(PRECACHE_PREFIX) ||
    LEGACY_CACHE_NAMES.includes(name) ||
    name.startsWith('workbox-precache')); // previous generateSW precache

/** Stable cache name per manifest content, so an update installs into a fresh cache. */
export const precacheCacheName = (entries: readonly PrecacheEntry[]): string => {
  const text = entries
    .map(e => `${e.url}@${e.revision ?? ''}`)
    .sort()
    .join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${PRECACHE_PREFIX}${hash.toString(16).padStart(8, '0')}`;
};

/** Absolute same-origin URLs from the injected manifest (entries may be strings or objects). */
export const normalizeManifest = (
  manifest: ReadonlyArray<string | PrecacheEntry> | undefined,
  origin: string,
): PrecacheEntry[] => {
  const out = new Map<string, PrecacheEntry>();
  for (const raw of manifest ?? []) {
    const entry = typeof raw === 'string' ? { url: raw, revision: null } : raw;
    if (!entry || typeof entry.url !== 'string') continue;
    const url = new URL(entry.url, origin + '/');
    if (url.origin !== origin) continue;
    url.hash = '';
    out.set(url.href, { url: url.href, revision: entry.revision ?? null });
  }
  return [...out.values()];
};

const isNonEmptyString = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** Strict PushPayload v1 parser; anything else is rejected (null). */
export const parsePushPayload = (data: unknown): PushPayload | null => {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return null;
  if (!isNonEmptyString(d.title, 200) || !isNonEmptyString(d.body, 1000)) return null;
  if (!isNonEmptyString(d.url, 2000) || !isNonEmptyString(d.tag, 200)) return null;
  return { version: 1, title: d.title, body: d.body, url: d.url, tag: d.tag };
};

/** Decode push data text as JSON; malformed input yields null. */
export const parsePushText = (text: string | null | undefined): PushPayload | null => {
  if (!text) return null;
  try {
    return parsePushPayload(JSON.parse(text));
  } catch {
    return null;
  }
};

/**
 * Only same-origin application paths may be opened from a notification.
 * Anything else (other origins, javascript:, protocol-relative, malformed) → the dashboard.
 */
export const safeAppUrl = (url: unknown, origin: string): string => {
  if (typeof url !== 'string' || !url.trim()) return origin + DEFAULT_APP_PATH;
  try {
    const parsed = new URL(url, origin + '/');
    if (parsed.origin !== origin || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
      return origin + DEFAULT_APP_PATH;
    }
    return parsed.href;
  } catch {
    return origin + DEFAULT_APP_PATH;
  }
};

/** Generic notification shown when a push arrives without a valid payload (browsers require one). */
export const FALLBACK_PUSH: PushPayload = {
  version: 1,
  title: 'TossIt',
  body: 'יש עדכון חדש באפליקציה.',
  url: DEFAULT_APP_PATH,
  tag: 'tossit-generic',
};

export type RouteDecision = 'precache' | 'app-shell' | 'passthrough';

export interface RequestInfo {
  method: string;
  url: string;
  mode?: string;
}

/**
 * - precached same-origin GET → cache first;
 * - same-origin page navigation → network first with cached app shell offline;
 * - everything else (other origins, non-GET, unknown same-origin files) → untouched.
 */
export const routeRequest = (
  req: RequestInfo,
  origin: string,
  precached: ReadonlySet<string>,
): RouteDecision => {
  if (req.method !== 'GET') return 'passthrough';
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return 'passthrough';
  }
  if (url.origin !== origin) return 'passthrough';
  url.hash = '';
  if (precached.has(url.href)) return 'precache';
  if (req.mode === 'navigate') return 'app-shell';
  return 'passthrough';
};
