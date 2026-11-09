import { createECDH } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { israelSlot, selectNotification, validateSubscription, createNotificationService, type PushDevice, type NotificationDependencies } from '../src/notifications';
const key = createECDH('prime256v1'); key.generateKeys();
const subscription = () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test-token', expirationTime: null, keys: { p256dh: key.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } });
const profile = (changes = {}) => ({ uid: 'staff', businessId: 'a', role: 'staff', department: 'bar', isActive: true, isOnShift: true, ...changes });
const device = (changes = {}): PushDevice => ({ id: 'device-test-12345', bindingId: 'binding-test-12345', capabilityHash: 'hash', uid: 'staff', businessId: 'a', enabled: true, subscription: subscription(), ...changes });
const expired = (changes = {}) => ({ id: 'milk', businessId: 'a', area: 'bar', expiryMs: Date.parse('2026-11-09T19:00:00Z'), ...changes });
const evening = () => israelSlot(new Date('2026-11-09T21:00:00Z'))!;
function setup() {
  const devices = new Map<string, PushDevice>([['device-test-12345', device()]]);
  const jobs = new Map<string, { token: string; state: string }>();
  let context = { profile: profile(), settings: null as Record<string, unknown> | null, items: [expired()] };
  const send = vi.fn(async () => undefined);
  const deps: NotificationDependencies = {
    profile: async () => context.profile,
    devices: { list: async () => [...devices.values()], get: async id => devices.get(id) ?? null,
      put: async record => { devices.set(record.id, record); return record; },
      revoke: async (id, capabilityHash, bindingId) => { const d = devices.get(id); if (!d || d.capabilityHash !== capabilityHash) throw Object.assign(new Error('Denied'), { code: 'permission-denied' }); if (d.bindingId !== bindingId) return false; d.enabled = false; return true; },
      invalidate: async (id, bindingId) => { const d = devices.get(id); if (d?.bindingId === bindingId) d.enabled = false; },
    },
    context: async () => context,
    jobs: { claim: async (id, token) => { if (jobs.has(id)) return false; jobs.set(id, { token, state: 'sending' }); return true; },
      finish: async (id, token, state) => { const job = jobs.get(id); if (job?.token !== token) return false; job.state = state; return true; },
      release: async (id, token) => { if (jobs.get(id)?.token === token) jobs.delete(id); },
    }, send, endShifts: vi.fn(async () => undefined), now: () => Date.parse('2026-11-09T21:00:00Z'),
  };
  return { service: createNotificationService(deps), deps, devices, jobs, send, setContext: (next: typeof context) => { context = next; } };
}
describe('Israel scheduling and recipient selection', () => {
  it.each([['2026-11-09T21:00:00Z', 'evening', '2026-11-09-2300'], ['2026-11-09T21:20:00Z', 'evening', '2026-11-09-2320'], ['2026-11-09T21:40:00Z', 'evening', '2026-11-09-2340'], ['2026-11-10T06:00:00Z', 'morning', '2026-11-10-0800'], ['2026-11-09T22:00:00Z', 'midnight', '2026-11-10-0000'], ['2026-07-09T20:00:00Z', 'evening', '2026-07-09-2300']])('maps %s to its Israel slot', (iso, kind, id) => {
    expect(israelSlot(new Date(iso))).toMatchObject({ kind, id });
  });
  it('does not schedule arbitrary minutes, or the wrong UTC hour after DST changes', () => {
    expect(israelSlot(new Date('2026-11-09T21:01:00Z'))).toBeNull();
    expect(israelSlot(new Date('2026-07-09T21:00:00Z'))?.kind).toBe('midnight');
    expect(israelSlot(new Date('2026-10-25T20:00:00Z'))).toBeNull();
  });
  it('selects only active on-shift department staff and unhandled expired items', () => {
    const context = { profile: profile(), settings: null, items: [expired(), expired({ id: 'done', finished: true }), expired({ id: 'waste', isThrown: true }), expired({ id: 'other-dept', area: 'kitchen' }), expired({ id: 'foreign', businessId: 'b' }), expired({ id: 'future', expiryMs: evening().atMs + 1 })] };
    expect(selectNotification(device(), context, evening())).toMatchObject({ count: 1 });
    for (const change of [{ isOnShift: false }, { isActive: false }, { businessId: 'b' }, { role: 'manager' }]) expect(selectNotification(device(), { ...context, profile: profile(change) }, evening())).toBeNull();
    expect(selectNotification(device(), { ...context, profile: profile({ department: 'kitchen' }) }, evening())?.count).toBe(1);
    expect(selectNotification(device(), { ...context, settings: { eveningRemindersEnabled: false } }, evening())).toBeNull();
  });
  it('normalizes legacy staff/departments and scopes manager summaries, with admin business-wide', () => {
    expect(selectNotification(device(), { profile: profile({ role: 'user', department: 'בר' }), settings: null, items: [expired({ area: 'בר' })] }, evening())?.count).toBe(1);
    const slot = israelSlot(new Date('2026-11-10T06:00:00Z'))!;
    const items = [expired(), expired({ id: 'kitchen', area: 'kitchen' })];
    expect(selectNotification(device(), { profile: profile({ role: 'manager', isOnShift: false }), settings: null, items }, slot)?.count).toBe(1);
    expect(selectNotification(device(), { profile: profile({ role: 'admin' }), settings: null, items }, slot)?.count).toBe(2);
    expect(selectNotification(device(), { profile: profile(), settings: null, items }, slot)).toBeNull();
    expect(selectNotification(device(), { profile: profile({ role: 'admin' }), settings: { morningSummaryEnabled: false }, items }, slot)).toBeNull();
  });
});
describe('subscription boundaries', () => {
  it('accepts current browser push endpoints with real P256/auth key shapes', () => {
    for (const endpoint of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://web.push.apple.com/abc', 'https://wns.notify.windows.com/w/?token=abc']) expect(validateSubscription({ ...subscription(), endpoint }).endpoint).toBe(endpoint);
  });
  it.each(['http://fcm.googleapis.com/a', 'https://127.0.0.1/push', 'https://fcm.googleapis.com.evil.test/a', 'https://evil.test/push', 'https://user:pass@fcm.googleapis.com/a', 'https://fcm.googleapis.com:444/a', 'https://fcm.googleapis.com/a#secret'])('rejects an unsafe endpoint %s', endpoint => {
    expect(() => validateSubscription({ ...subscription(), endpoint })).toThrow();
  });
  it('rejects malformed keys and expiration values', () => {
    expect(() => validateSubscription({ ...subscription(), keys: { p256dh: 'bad', auth: 'bad' } })).toThrow();
    expect(() => validateSubscription({ ...subscription(), expirationTime: 'tomorrow' })).toThrow();
  });
  it('derives subscription identity from the profile and enforces expected actor/business', async () => {
    const { service, devices } = setup();
    const input = { deviceId: 'new-device-123456', deviceToken: 'a'.repeat(64), bindingId: 'new-binding-12345', subscription: subscription(), expectedActorUid: 'staff', expectedBusinessId: 'a' };
    await expect(service.register(null, input)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(service.register('staff', { ...input, expectedBusinessId: 'b' })).rejects.toMatchObject({ code: 'permission-denied' });
    await service.register('staff', { ...input, uid: 'forged', businessId: 'forged' });
    expect(devices.get(input.deviceId)).toMatchObject({ uid: 'staff', businessId: 'a', enabled: true });
    expect(devices.get(input.deviceId)).not.toHaveProperty('deviceToken');
  });
  it('does not report an expired subscription enabled', async () => {
    const { service, deps, devices } = setup();
    const input = { deviceId: 'expiry-device-12345', deviceToken: 'a'.repeat(64), bindingId: 'expiry-binding-12345', expectedActorUid: 'staff', expectedBusinessId: 'a', subscription: subscription() };
    await expect(service.register('staff', { ...input, subscription: { ...subscription(), expirationTime: deps.now() - 1 } })).rejects.toMatchObject({ code: 'failed-precondition' });
    await service.register('staff', input); devices.get(input.deviceId)!.subscription.expirationTime = deps.now() - 1;
    expect(await service.status('staff', input)).toEqual({ enabled: false });
  });
});
describe('durable delivery dispatch', () => {
  it('deduplicates duplicate/concurrent scheduler invocations for each device and slot', async () => {
    const { service, send, jobs } = setup(); await Promise.all([service.run(evening()), service.run(evening())]);
    expect(send).toHaveBeenCalledTimes(1); expect([...jobs.values()]).toMatchObject([{ state: 'sent' }]);
    expect(send.mock.calls[0]).toBeDefined();
  });
  it('invalidates 410 subscriptions but retains valid endpoints on transient failure for retry', async () => {
    const one = setup(); one.send.mockRejectedValueOnce({ statusCode: 410 }); await one.service.run(evening());
    expect(one.devices.get('device-test-12345')?.enabled).toBe(false);
    const two = setup(); two.send.mockRejectedValueOnce({ statusCode: 503 });
    await expect(two.service.run(evening())).rejects.toThrow();
    expect(two.devices.get('device-test-12345')?.enabled).toBe(true);
    await two.service.run(evening()); expect(two.send).toHaveBeenCalledTimes(2);
  });
  it('rechecks device binding after its delivery claim and never sends to a switched account', async () => {
    const { service, deps, devices, send } = setup(); const original = deps.jobs.claim;
    deps.jobs.claim = async (...args) => { const result = await original(...args); devices.get('device-test-12345')!.bindingId = 'another-binding'; return result; };
    await service.run(evening()); expect(send).not.toHaveBeenCalled();
  });
  it('does not send for a late event or malformed settings, and handles midnight separately', async () => {
    const { service, send, deps, setContext } = setup();
    await service.run({ ...evening(), atMs: evening().atMs - 3600000 }); expect(send).not.toHaveBeenCalled();
    setContext({ profile: profile(), settings: { timezone: 'UTC' }, items: [expired()] });
    await expect(service.run(evening())).rejects.toThrow(); expect(send).not.toHaveBeenCalled();
    await service.run({ ...evening(), kind: 'midnight' }); expect(deps.endShifts).toHaveBeenCalledOnce();
  });
  it('does not release a confirmed delivery for redispatch when receipt persistence fails', async () => {
    const { service, deps, send } = setup();
    const release = vi.spyOn(deps.jobs, 'release');
    vi.spyOn(deps.jobs, 'finish').mockRejectedValue(new Error('Firestore unavailable'));
    await expect(service.run(evening())).rejects.toThrow();
    await service.run(evening());
    expect(send).toHaveBeenCalledTimes(1); expect(release).not.toHaveBeenCalled();
  });
});
