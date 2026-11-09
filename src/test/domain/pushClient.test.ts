import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enablePushNotifications, disablePushNotifications, getPushNotificationState, syncPushNotificationsSession } from '../../utils/notificationUtils';
const state = vi.hoisted(() => ({ uid: 'staff' as string | null, denied: false, failRegister: false, failRevoke: false, holdRegister: false, resumeRegister: undefined as undefined | (() => void), calls: [] as { name: string; input: Record<string, unknown> }[], request: undefined as undefined | (() => Promise<NotificationPermission>) }));
vi.mock('../../services/firebase', () => ({ functions: {}, auth: { get currentUser() { return state.uid ? { uid: state.uid } : null; } } }));
vi.mock('../../api/access', () => ({ getCurrentActor: async () => {
  if (!state.uid) throw Object.assign(new Error('Sign in'), { code: 'unauthenticated' });
  return { uid: state.uid, businessId: 'a', role: 'staff', department: 'bar' };
} }));
vi.mock('firebase/functions', () => ({ httpsCallable: (_functions: unknown, name: string) => async (input: Record<string, unknown>) => {
  state.calls.push({ name, input });
  if (name === 'upsertPushDevice' && state.holdRegister) await new Promise<void>(resolve => { state.resumeRegister = resolve; });
  if (name === 'upsertPushDevice' && state.failRegister) throw Object.assign(new Error('Network'), { code: 'functions/unavailable' });
  if (name === 'revokePushDevice' && state.failRevoke) throw Object.assign(new Error('Network'), { code: 'functions/unavailable' });
  return { data: name === 'getPushDeviceStatus' ? { enabled: true } : name === 'revokePushDevice' ? { revoked: true } : { deviceId: input.deviceId, bindingId: input.bindingId, enabled: true } };
} }));
let permission: NotificationPermission;
let registration: { scope: string; active: { scriptURL: string }; pushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } };
let subscription: { endpoint: string; toJSON: () => PushSubscriptionJSON; unsubscribe: ReturnType<typeof vi.fn> } | null;
let register: ReturnType<typeof vi.fn>; let request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear(); state.uid = 'staff'; state.calls = []; state.failRegister = false; state.failRevoke = false; state.holdRegister = false; state.resumeRegister = undefined; state.request = undefined; permission = 'default';
  const make = () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/browser', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/browser', expirationTime: null, keys: { p256dh: 'browser-generated-public-key', auth: 'browser-generated-auth-key' } }), unsubscribe: vi.fn(async () => { subscription = null; return true; }) });
  subscription = null; register = vi.fn(); request = vi.fn(async () => { permission = state.request ? await state.request() : state.denied ? 'denied' : 'granted'; return permission; });
  state.denied = false;
  registration = { scope: location.origin + '/', active: { scriptURL: location.origin + '/service-worker.js' }, pushManager: { getSubscription: vi.fn(async () => subscription), subscribe: vi.fn(async () => { subscription = make(); return subscription; }) } };
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: { ready: Promise.resolve(registration), register } });
  vi.stubGlobal('PushManager', function () {});
  vi.stubGlobal('Notification', { get permission() { return permission; }, requestPermission: request });
  const key = new Uint8Array(65).fill(1); key[0] = 4;
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', btoa(String.fromCharCode(...key)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('explicit device notification controls', () => {
  it('does not ask permission, register a worker or opt in while merely reading status', async () => {
    expect(await getPushNotificationState()).toBe('disabled');
    expect(request).not.toHaveBeenCalled(); expect(register).not.toHaveBeenCalled(); expect(state.calls).toEqual([]);
  });
  it('opts in through the existing ready worker and resolves enabled only after server confirmation', async () => {
    expect(await enablePushNotifications()).toBe('enabled');
    expect(register).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledOnce();
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(state.calls[0]).toMatchObject({ name: 'upsertPushDevice', input: { expectedActorUid: 'staff', expectedBusinessId: 'a' } });
    expect(await getPushNotificationState()).toBe('enabled');
  });
  it('returns denied without subscribing, and unsupported without a prompt', async () => {
    state.denied = true; expect(await enablePushNotifications()).toBe('denied');
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    vi.stubGlobal('PushManager', undefined);
    expect(await enablePushNotifications()).toBe('unsupported');
    expect(request).toHaveBeenCalledOnce();
  });
  it('does not prompt with missing VAPID config and never reports enabled after a failed server write', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    await expect(enablePushNotifications()).rejects.toMatchObject({ code: 'unavailable' }); expect(request).not.toHaveBeenCalled();
    const key = new Uint8Array(65).fill(1); key[0] = 4; vi.stubEnv('VITE_VAPID_PUBLIC_KEY', btoa(String.fromCharCode(...key)).replace(/=+$/, ''));
    state.failRegister = true; await expect(enablePushNotifications()).rejects.toMatchObject({ code: 'functions/unavailable' });
    expect(localStorage.getItem('tossit.push.device.v1')).toContain('pending-enable');
  });
  it('cancels an opt-in when the signed-in identity changes while permission is pending', async () => {
    let finish!: (value: NotificationPermission) => void;
    state.request = () => new Promise(resolve => { finish = resolve; });
    const enabling = enablePushNotifications(); state.uid = 'another'; finish('granted');
    await expect(enabling).rejects.toMatchObject({ code: 'unauthenticated' }); expect(state.calls).toEqual([]);
  });
  it('retains a failed revocation and flushes it after logout without re-enabling permission', async () => {
    await enablePushNotifications(); const old = JSON.parse(localStorage.getItem('tossit.push.device.v1')!);
    state.failRevoke = true; await expect(disablePushNotifications()).rejects.toThrow();
    expect(await getPushNotificationState()).toBe('pending-disable');
    state.uid = null; state.failRevoke = false; await syncPushNotificationsSession(null);
    expect(await getPushNotificationState()).toBe('disabled');
    expect(state.calls.filter(call => call.name === 'revokePushDevice').slice(-1)[0]?.input).toMatchObject({ deviceId: old.deviceId, bindingId: old.bindingId });
    expect(request).toHaveBeenCalledOnce();
  });
  it('removes an old-account device binding before explicitly binding another account', async () => {
    await enablePushNotifications(); state.uid = 'another'; await syncPushNotificationsSession('another', 'a');
    expect(await getPushNotificationState()).toBe('disabled');
    await enablePushNotifications();
    expect(state.calls.filter(call => call.name === 'upsertPushDevice').slice(-1)[0]?.input.expectedActorUid).toBe('another');
  });
  it('does not let a late successful enable overwrite a saved pending cancellation', async () => {
    state.holdRegister = true; const enabling = enablePushNotifications();
    await vi.waitFor(() => expect(state.resumeRegister).toBeDefined());
    state.failRevoke = true; await expect(disablePushNotifications()).rejects.toThrow();
    state.resumeRegister!();
    await expect(enabling).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(localStorage.getItem('tossit.push.device.v1')).toContain('pending-disable');
  });
});
