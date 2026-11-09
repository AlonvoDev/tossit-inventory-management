import { describe, it, expect } from 'vitest';
import {
  isOwnedObsoleteCache,
  normalizeManifest,
  parsePushPayload,
  parsePushText,
  precacheCacheName,
  routeRequest,
  safeAppUrl,
} from './swLogic';

const ORIGIN = 'https://tossit.example';

describe('parsePushPayload', () => {
  const valid = { version: 1, title: 'פריטים פגי תוקף', body: '3 פריטים בבר', url: '/dashboard', tag: 'evening-2300' };

  it('accepts a valid v1 payload and drops unknown fields', () => {
    expect(parsePushPayload({ ...valid, icon: 'https://evil/x.png' })).toEqual(valid);
  });

  it.each([
    ['null', null],
    ['string', 'hello'],
    ['wrong version', { ...valid, version: 2 }],
    ['missing title', { ...valid, title: undefined }],
    ['empty body', { ...valid, body: '  ' }],
    ['numeric url', { ...valid, url: 5 }],
    ['missing tag', { ...valid, tag: undefined }],
    ['huge title', { ...valid, title: 'x'.repeat(500) }],
  ])('rejects %s', (_, input) => {
    expect(parsePushPayload(input)).toBeNull();
  });

  it('rejects malformed JSON text', () => {
    expect(parsePushText('{not json')).toBeNull();
    expect(parsePushText('')).toBeNull();
    expect(parsePushText(JSON.stringify(valid))).toEqual(valid);
  });
});

describe('safeAppUrl', () => {
  it('keeps same-origin paths', () => {
    expect(safeAppUrl('/admin?tab=reports', ORIGIN)).toBe(`${ORIGIN}/admin?tab=reports`);
    expect(safeAppUrl(`${ORIGIN}/dashboard`, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
  });

  it.each(['https://evil.example/phish', '//evil.example/x', 'javascript:alert(1)', 'data:text/html,hi', '', 42, null])(
    'sends %s to the dashboard',
    input => {
      expect(safeAppUrl(input, ORIGIN)).toBe(`${ORIGIN}/dashboard`);
    },
  );
});

describe('precache manifest and caches', () => {
  it('normalizes entries to absolute same-origin URLs and ignores foreign ones', () => {
    const entries = normalizeManifest(
      [{ url: 'index.html', revision: 'a' }, 'assets/app-123.js', { url: 'https://cdn.other/x.js', revision: null }],
      ORIGIN,
    );
    expect(entries.map(e => e.url)).toEqual([`${ORIGIN}/index.html`, `${ORIGIN}/assets/app-123.js`]);
  });

  it('cache name changes when content revisions change', () => {
    const a = precacheCacheName([{ url: '/index.html', revision: '1' }]);
    const b = precacheCacheName([{ url: '/index.html', revision: '2' }]);
    expect(a).toMatch(/^tossit-precache-[0-9a-f]{8}$/);
    expect(a).not.toBe(b);
    expect(precacheCacheName([{ url: '/index.html', revision: '1' }])).toBe(a);
  });

  it('deletes only obsolete caches this app created', () => {
    const current = 'tossit-precache-aaaaaaaa';
    expect(isOwnedObsoleteCache('tossit-precache-bbbbbbbb', current)).toBe(true);
    expect(isOwnedObsoleteCache('tossit-cache-v1', current)).toBe(true);
    expect(isOwnedObsoleteCache('workbox-precache-v2-https://x/', current)).toBe(true);
    expect(isOwnedObsoleteCache(current, current)).toBe(false);
    expect(isOwnedObsoleteCache('firebase-heartbeat-database', current)).toBe(false);
    expect(isOwnedObsoleteCache('some-other-app', current)).toBe(false);
  });
});

describe('routeRequest', () => {
  const precached = new Set([`${ORIGIN}/assets/app.js`, `${ORIGIN}/index.html`]);

  it('serves precached assets from cache', () => {
    expect(routeRequest({ method: 'GET', url: `${ORIGIN}/assets/app.js` }, ORIGIN, precached)).toBe('precache');
  });

  it('uses the app shell only for same-origin navigations', () => {
    expect(routeRequest({ method: 'GET', url: `${ORIGIN}/admin/users`, mode: 'navigate' }, ORIGIN, precached)).toBe('app-shell');
  });

  it.each([
    ['Firestore API', { method: 'GET', url: 'https://firestore.googleapis.com/v1/projects/x/documents', mode: 'cors' }],
    ['auth API', { method: 'POST', url: 'https://identitytoolkit.googleapis.com/v1/accounts', mode: 'cors' }],
    ['same-origin POST', { method: 'POST', url: `${ORIGIN}/assets/app.js` }],
    ['unknown same-origin file', { method: 'GET', url: `${ORIGIN}/api/private.json`, mode: 'cors' }],
  ])('passes through %s untouched', (_, req) => {
    expect(routeRequest(req, ORIGIN, precached)).toBe('passthrough');
  });
});
