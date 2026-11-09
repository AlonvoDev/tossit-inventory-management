import { createHash, ECDH, randomUUID } from 'node:crypto';

export interface PushPayload { version: 1; title: string; body: string; url: string; tag: string }
export interface WebSubscription { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }
export interface PushDevice { id: string; bindingId: string; capabilityHash: string; uid: string; businessId: string; enabled: boolean; subscription: WebSubscription }
export interface NotificationContext { profile: Record<string, unknown> | null; settings: Record<string, unknown> | null; items: { id: string; businessId: string; area: unknown; expiryMs: number; finished?: boolean; discarded?: boolean; isThrown?: boolean }[] }
export interface NotificationSlot { kind: 'evening' | 'morning' | 'midnight'; id: string; atMs: number }
export class PushError extends Error {
  constructor(public readonly code: 'unauthenticated' | 'permission-denied' | 'invalid-argument' | 'already-exists' | 'failed-precondition', message: string) { super(message); }
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const invalid = (message: string): never => { throw new PushError('invalid-argument', message); };
const department = (value: unknown) => value === 'bar' || value === 'בר' ? 'bar' : value === 'kitchen' || value === 'מטבח' ? 'kitchen' : null;
export function israelSlot(date: Date): NotificationSlot | null {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
  const hm = parts.hour + parts.minute;
  const kind = ['2300', '2320', '2340'].includes(hm) ? 'evening' : hm === '0800' ? 'morning' : hm === '0000' ? 'midnight' : null;
  return kind ? { kind, id: `${parts.year}-${parts.month}-${parts.day}-${hm}`, atMs: Math.floor(date.getTime() / 60000) * 60000 } : null;
}
export function settingsValues(data: Record<string, unknown> | null) {
  if (data?.timezone !== undefined && data.timezone !== 'Asia/Jerusalem') invalid('Unsupported notification timezone');
  const result = { eveningRemindersEnabled: true, morningSummaryEnabled: true, autoEndShiftsAtMidnight: false };
  for (const key of Object.keys(result) as (keyof typeof result)[]) {
    const value = data?.[key];
    if (value !== undefined) { if (typeof value !== 'boolean') invalid('Malformed notification setting'); result[key] = value as boolean; }
  }
  return result;
}
export function validProfile(profile: Record<string, unknown> | null): boolean {
  return !!profile && (profile.isActive === undefined || profile.isActive === true) && typeof profile.uid === 'string' && !!profile.uid
    && typeof profile.businessId === 'string' && !!profile.businessId.trim() && ['admin', 'manager', 'staff', 'user'].includes(String(profile.role)) && department(profile.department) !== null;
}
export function selectNotification(device: PushDevice, context: NotificationContext, slot: NotificationSlot): { count: number; payload: PushPayload } | null {
  const { profile } = context;
  if (!device.enabled || !validProfile(profile) || profile!.uid !== device.uid || profile!.businessId !== device.businessId
      || (device.subscription.expirationTime !== null && device.subscription.expirationTime <= slot.atMs)) return null;
  const settings = settingsValues(context.settings);
  const role = profile!.role === 'user' ? 'staff' : profile!.role;
  if (slot.kind === 'midnight' || (slot.kind === 'evening' && (!settings.eveningRemindersEnabled || role !== 'staff' || profile!.isOnShift !== true))
      || (slot.kind === 'morning' && (!settings.morningSummaryEnabled || !['admin', 'manager'].includes(String(role))))) return null;
  const count = context.items.filter(item => item.businessId === device.businessId && (role === 'admin' || department(item.area) === department(profile!.department))
    && Number.isFinite(item.expiryMs) && item.expiryMs <= slot.atMs && !item.finished && !item.discarded && !item.isThrown).length;
  if (!count) return null;
  return { count, payload: { version: 1, title: slot.kind === 'evening' ? 'TossIt — תזכורת טיפול' : 'TossIt — סיכום בוקר',
    body: `יש ${count} פריטים שפג תוקפם וממתינים לטיפול. פתח את האפליקציה לבדיקה.`, url: '/dashboard', tag: `tossit-${digest(JSON.stringify([slot.id, device.id, device.uid])).slice(0, 40)}` } };
}
export function validateSubscription(input: unknown): WebSubscription {
  if (!input || typeof input !== 'object') return invalid('Invalid subscription');
  const data = input as Record<string, unknown>;
  if (typeof data.endpoint !== 'string' || data.endpoint.length > 2000) invalid('Invalid endpoint');
  let url: URL;
  try { url = new URL(data.endpoint as string); } catch { return invalid('Invalid endpoint'); }
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port || url.pathname === '/'
      || !(host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com'))) invalid('Unsupported push service endpoint');
  const keys = data.keys as Record<string, unknown> | undefined;
  function bytes(value: unknown, length: number): string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(value) || Buffer.from(value, 'base64url').length !== length) return invalid('Invalid subscription encryption key');
    return value;
  }
  const p256dh = bytes(keys?.p256dh, 65); const auth = bytes(keys?.auth, 16);
  try { ECDH.convertKey(Buffer.from(p256dh, 'base64url'), 'prime256v1'); } catch { return invalid('Invalid subscription P256 public key'); }
  const expirationTime = data.expirationTime ?? null;
  if (expirationTime !== null && (typeof expirationTime !== 'number' || !Number.isFinite(expirationTime) || expirationTime <= 0)) invalid('Invalid subscription expiration');
  return { endpoint: data.endpoint as string, expirationTime: expirationTime as number | null, keys: { p256dh, auth } };
}
export interface NotificationDependencies {
  profile(uid: string): Promise<Record<string, unknown> | null>;
  devices: {
    list(): Promise<PushDevice[]>; get(id: string): Promise<PushDevice | null>;
    put(device: PushDevice): Promise<PushDevice>;
    revoke(id: string, capabilityHash: string, bindingId: string): Promise<boolean>;
    invalidate(id: string, bindingId: string): Promise<void>;
  };
  context(device: PushDevice): Promise<NotificationContext>;
  jobs: {
    claim(id: string, token: string, now: number): Promise<boolean>;
    finish(id: string, token: string, status: 'sent' | 'skipped' | 'invalid' | 'failed'): Promise<boolean>;
    release(id: string, token: string): Promise<void>;
  };
  send(subscription: WebSubscription, payload: PushPayload): Promise<void>;
  endShifts(slot: NotificationSlot): Promise<void>;
  now(): number;
}
function record(input: unknown): Record<string, unknown> { if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid('Invalid request'); return input as Record<string, unknown>; }
function credentials(data: Record<string, unknown>) {
  if (typeof data.deviceId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(data.deviceId) || typeof data.bindingId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(data.bindingId)
      || typeof data.deviceToken !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(data.deviceToken)) invalid('Invalid device credentials');
  return { id: data.deviceId as string, bindingId: data.bindingId as string, capabilityHash: digest(data.deviceToken as string) };
}
export function createNotificationService(deps: NotificationDependencies) {
  async function actor(uid: string | null, data: Record<string, unknown>) {
    if (!uid) throw new PushError('unauthenticated', 'Sign in first');
    const profile = await deps.profile(uid);
    if (!validProfile(profile) || data.expectedActorUid !== uid || data.expectedBusinessId !== profile!.businessId) throw new PushError('permission-denied', 'Device account or business changed');
    return profile!;
  }
  return {
    async register(uid: string | null, input: unknown) {
      const data = record(input); const profile = await actor(uid, data); const capability = credentials(data);
      const device = await deps.devices.put({ ...capability, uid: profile.uid as string, businessId: profile.businessId as string, enabled: true, subscription: validateSubscription(data.subscription) });
      return { deviceId: device.id, bindingId: device.bindingId, enabled: true };
    },
    async revoke(input: unknown) { const data = credentials(record(input)); return { revoked: await deps.devices.revoke(data.id, data.capabilityHash, data.bindingId) }; },
    async status(uid: string | null, input: unknown) {
      const data = record(input); const profile = await actor(uid, data); const capability = credentials(data); const device = await deps.devices.get(capability.id);
      const enabled = !!device && device.capabilityHash === capability.capabilityHash && device.bindingId === capability.bindingId && device.enabled && device.uid === profile.uid && device.businessId === profile.businessId;
      return { enabled };
    },
    async run(slot: NotificationSlot) {
      const now = deps.now();
      if (!Number.isFinite(slot.atMs) || now < slot.atMs - 60000 || now - slot.atMs > 600000) return;
      if (slot.kind === 'midnight') { await deps.endShifts(slot); return; }
      let retry = false;
      const devices = (await deps.devices.list()).map(device => structuredClone(device));
      // Bounded batches avoid unbounded HTTP fan-out and keep lease duration above execution time.
      for (let start = 0; start < devices.length; start += 4) await Promise.all(devices.slice(start, start + 4).map(async device => {
        if (!selectNotification(device, await deps.context(device), slot)) return;
        const id = digest(JSON.stringify([slot.id, device.id, device.uid])); const token = randomUUID();
        if (!await deps.jobs.claim(id, token, now)) return;
        try {
          const current = await deps.devices.get(device.id);
          const selected = current && current.bindingId === device.bindingId && current.uid === device.uid && current.businessId === device.businessId ? selectNotification(current, await deps.context(current), slot) : null;
          if (!selected) { await deps.jobs.finish(id, token, 'skipped'); return; }
          await deps.send(current!.subscription, selected.payload);
          await deps.jobs.finish(id, token, 'sent');
        } catch (error) {
          const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0;
          if (status === 404 || status === 410) { await deps.devices.invalidate(device.id, device.bindingId); await deps.jobs.finish(id, token, 'invalid'); }
          else if (!status || status === 401 || status === 403 || status === 429 || status >= 500) { await deps.jobs.release(id, token); retry = true; }
          else await deps.jobs.finish(id, token, 'failed');
        }
      }));
      if (retry) throw new Error('Push transport unavailable; retained deliveries can retry within the slot window');
    },
  };
}
