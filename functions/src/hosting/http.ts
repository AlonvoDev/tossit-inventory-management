/** Host-neutral Firebase callable wire boundary. Business authorization stays in the services. */
export const serverCallNames = ['createEmployee', 'updateEmployee', 'deactivateEmployee', 'upsertPushDevice', 'revokePushDevice', 'getPushDeviceStatus'] as const;
export type ServerCallName = typeof serverCallNames[number];
export class HostingError extends Error { constructor(public readonly code: string) { super(code); } }
export interface HostingDependencies {
  allowedOrigins: readonly string[];
  authenticate(token: string): Promise<string>;
  call(name: ServerCallName, data: unknown, uid: string | null): Promise<unknown>;
  scheduled(at: number): Promise<void>;
  parseTrigger(headers: Headers, body: unknown): number | null;
  ready(): boolean;
}
const errors: Record<string, [number, string]> = {
  'unauthenticated': [401, 'Sign in again'], 'permission-denied': [403, 'Operation is not permitted'],
  'invalid-argument': [400, 'Invalid request'], 'not-found': [404, 'Not found'],
  'already-exists': [409, 'Record already exists'], 'failed-precondition': [400, 'Operation cannot be completed in this state'],
  'aborted': [409, 'Another operation is in progress; retry'], 'unavailable': [503, 'Server unavailable; retry'],
  'deadline-exceeded': [504, 'Request timed out; retry'],
  'resource-exhausted': [429, 'Too many requests'], 'internal': [500, 'Operation failed; retry'],
};
const maxBytes = 32768;
const allowedHeaders = ['authorization', 'content-type', 'firebase-instance-id-token', 'x-firebase-appcheck'];
async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw new HostingError('invalid-argument');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new HostingError('too-large');
  const reader = request.body?.getReader(); if (!reader) throw new HostingError('invalid-argument');
  const chunks: Uint8Array[] = []; let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve,reject) => { timer=setTimeout(()=>reject(new HostingError('deadline-exceeded')),10000); });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]); if (done) break;
      size += value.byteLength; if (size > maxBytes) { throw new HostingError('too-large'); }
      chunks.push(value);
    }
  } finally { clearTimeout(timer); void reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new HostingError('invalid-argument'); }
}
export function createHttpHandler(deps: HostingDependencies): (request: Request) => Promise<Response> {
  return async request => {
    const headers: Record<string,string> = { 'content-type': 'application/json', 'cache-control': 'no-store', 'vary': 'Origin' };
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
    const failure = (raw: string) => {
      const code = Object.hasOwn(errors, raw) ? raw : 'internal';
      const [status, message] = errors[code];
      return json({ error: { status: code.replace(/-/g, '_').toUpperCase(), message } }, status);
    };
    const origin = request.headers.get('origin');
    if (origin) {
      if (!deps.allowedOrigins.includes(origin)) return failure('permission-denied');
      headers['access-control-allow-origin'] = origin;
    }
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return json({ service: 'tossit-server', configured: deps.ready() });
    const name = path.slice(1);
    if (path !== '/scheduled' && !(serverCallNames as readonly string[]).includes(name)) return failure('not-found');
    if (request.method === 'OPTIONS') {
      const requested = (request.headers.get('access-control-request-headers') ?? '').toLowerCase().split(',').map(h => h.trim()).filter(Boolean);
      if (!origin || request.headers.get('access-control-request-method') !== 'POST' || requested.some(h => !allowedHeaders.includes(h))) return failure('permission-denied');
      return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': allowedHeaders.join(', ') } });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, allow: 'POST' } });
    try {
      if (path === '/scheduled') {
        const at = deps.parseTrigger(request.headers, await readJson(request));
        if (at === null || !Number.isFinite(at)) return failure('unauthenticated');
        await deps.scheduled(at); return json({ result: { ok: true } });
      }
      let uid: string | null = null;
      const authorization = request.headers.get('authorization');
      if (authorization !== null) {
        const token = /^Bearer ([^\s]+)$/.exec(authorization)?.[1]; if (!token) return failure('unauthenticated');
        try { uid = await deps.authenticate(token); if (!uid) return failure('unauthenticated'); }
        catch (error) { return failure(error instanceof HostingError && error.code === 'unavailable' ? 'unavailable' : 'unauthenticated'); }
      }
      if (!uid && name !== 'revokePushDevice') return failure('unauthenticated');
      const body = await readJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'data')) return failure('invalid-argument');
      return json({ result: await deps.call(name as ServerCallName, (body as {data:unknown}).data, uid) });
    } catch (error) {
      const rawCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'internal';
      const code = rawCode === 'auth/email-already-exists' ? 'already-exists' : ['auth/invalid-email', 'auth/invalid-password'].includes(rawCode) ? 'invalid-argument' : rawCode;
      if (code === 'too-large') return json({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Request is too large' } }, 413);
      return failure(code);
    }
  };
}
