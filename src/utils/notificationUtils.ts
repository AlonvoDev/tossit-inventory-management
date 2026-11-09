import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebase';
import { getCurrentActor } from '../api/access';
import { InventoryError } from '../domain/errors';

export type PushNotificationState = 'enabled' | 'disabled' | 'pending-disable' | 'denied' | 'unsupported';
interface DeviceState {
  deviceId: string; deviceToken: string; bindingId?: string; uid?: string; businessId?: string;
  state: 'new' | 'pending-enable' | 'enabled' | 'pending-disable';
}
const storageKey = 'tossit.push.device.v1';
export const isNotificationsSupported = () => typeof window !== 'undefined' && typeof Notification !== 'undefined'
  && typeof PushManager !== 'undefined' && 'serviceWorker' in navigator;
export async function checkNotificationPermission(): Promise<NotificationPermission | 'unsupported'> { return isNotificationsSupported() ? Notification.permission : 'unsupported'; }
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationsSupported()) throw new InventoryError('unavailable', 'Notifications are not supported');
  return Notification.requestPermission(); // Explicit user action only; never called by startup/status helpers.
}
function readDevice(): DeviceState | null {
  const raw = localStorage.getItem(storageKey); if (!raw) return null;
  try {
    const state = JSON.parse(raw) as DeviceState;
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(state.deviceId) || !/^[A-Za-z0-9_-]{43,128}$/.test(state.deviceToken)
        || !['new', 'pending-enable', 'enabled', 'pending-disable'].includes(state.state)
        || (state.state !== 'new' && (!state.bindingId || !state.uid || !state.businessId))) throw new Error('invalid');
    return state;
  } catch { throw new InventoryError('unavailable', 'Saved device state needs review; no subscription data was discarded'); }
}
function writeDevice(state: DeviceState): void {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { throw new InventoryError('unavailable', 'Device settings cannot be saved on this browser'); }
}
function currentUid(expected?: string): string {
  const uid = auth.currentUser?.uid;
  if (!uid || (expected && uid !== expected)) throw new InventoryError('unauthenticated', 'Account changed during notification setup');
  return uid;
}
function keyBytes(): Uint8Array {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key || !/^[A-Za-z0-9_-]+={0,2}$/.test(key)) throw new InventoryError('unavailable', 'Notifications are not configured for this deployment');
  let bytes: Uint8Array;
  try { const binary = atob(key.replace(/-/g, '+').replace(/_/g, '/')); bytes = Uint8Array.from(binary, letter => letter.charCodeAt(0)); }
  catch { throw new InventoryError('unavailable', 'Invalid public push configuration'); }
  if (bytes.length !== 65 || bytes[0] !== 4) throw new InventoryError('unavailable', 'Invalid public push configuration');
  return bytes;
}
async function bounded<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new InventoryError('unavailable', 'The app worker is not ready; update the app and retry')), timeoutMs); })]); }
  finally { if (timer) clearTimeout(timer); }
}
async function readyWorker(requireCurrent = true): Promise<ServiceWorkerRegistration> {
  const registration = await bounded(navigator.serviceWorker.ready, requireCurrent ? 8000 : 2000);
  if (requireCurrent && (registration.scope !== location.origin + '/' || registration.active?.scriptURL !== location.origin + '/service-worker.js')) throw new InventoryError('unavailable', 'Update TossIt before enabling notifications');
  return registration;
}
async function call<T>(name: string, input: unknown): Promise<T> { return (await httpsCallable<unknown, T>(functions, name, { timeout: 10000 })(input)).data; }
const credentials = (state: DeviceState) => ({ deviceId: state.deviceId, deviceToken: state.deviceToken, bindingId: state.bindingId });
function stillCurrent(state: DeviceState): boolean { const latest = readDevice(); return !!latest && latest.state === state.state && latest.bindingId === state.bindingId && latest.uid === state.uid && latest.businessId === state.businessId; }

export async function disablePushNotifications(): Promise<void> {
  const state = readDevice(); if (!state?.bindingId) return;
  const pending = { ...state, state: 'pending-disable' as const }; writeDevice(pending);
  const local = (async () => {
    if (!isNotificationsSupported()) return;
    const registration = await readyWorker(false); const subscription = await registration.pushManager.getSubscription();
    if (subscription && !await subscription.unsubscribe()) throw new InventoryError('unavailable', 'Browser subscription could not be disabled');
  })();
  const remote = (async () => {
    if (navigator.onLine === false) throw new InventoryError('unavailable', 'Device cleanup is saved and will retry online');
    await call('revokePushDevice', credentials(pending));
  })();
  const results = await Promise.allSettled([local, remote]);
  const failed = results.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason; // Keep the original binding/capability for retry.
  if (stillCurrent(pending)) writeDevice({ deviceId: pending.deviceId, deviceToken: pending.deviceToken, state: 'new' });
}
export async function syncPushNotificationsSession(uid: string | null, businessId?: string): Promise<void> {
  const state = readDevice();
  if (state?.bindingId && (state.state === 'pending-disable' || state.uid !== uid || (businessId !== undefined && state.businessId !== businessId))) await disablePushNotifications();
}
export async function enablePushNotifications(): Promise<'enabled' | 'denied' | 'unsupported'> {
  if (!isNotificationsSupported()) return 'unsupported';
  const expectedUid = currentUid(); const key = keyBytes();
  // Call immediately on the button gesture, before asynchronous profile/network reads.
  const permission = Notification.permission === 'default' ? await requestNotificationPermission() : Notification.permission;
  currentUid(expectedUid); if (permission !== 'granted') return 'denied';
  const actor = await getCurrentActor(); currentUid(expectedUid);
  let previous = readDevice();
  if (previous?.bindingId && (previous.state === 'pending-disable' || previous.uid !== actor.uid || previous.businessId !== actor.businessId)) { await disablePushNotifications(); currentUid(expectedUid); previous = readDevice(); }
  const registration = await readyWorker(); currentUid(expectedUid);
  let subscription = await registration.pushManager.getSubscription(); currentUid(expectedUid);
  if (subscription?.options?.applicationServerKey) {
    const oldKey = new Uint8Array(subscription.options.applicationServerKey);
    if (oldKey.length !== key.length || oldKey.some((byte, index) => byte !== key[index])) {
      if (previous?.bindingId) await disablePushNotifications(); else await subscription.unsubscribe();
      subscription = null; previous = readDevice(); currentUid(expectedUid);
    }
  }
  const state: DeviceState = previous?.state === 'pending-enable' && previous.uid === actor.uid && previous.businessId === actor.businessId ? previous : {
    deviceId: previous?.deviceId ?? crypto.randomUUID(), deviceToken: previous?.deviceToken ?? crypto.randomUUID() + crypto.randomUUID(),
    bindingId: crypto.randomUUID(), uid: actor.uid, businessId: actor.businessId, state: 'pending-enable',
  };
  writeDevice(state); // Persist a revocable intent before browser/server subscription writes.
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key.buffer as ArrayBuffer });
  currentUid(expectedUid);
  const response = await call<{ enabled: boolean; bindingId: string }>('upsertPushDevice', { ...credentials(state), subscription: subscription.toJSON(), expectedActorUid: actor.uid, expectedBusinessId: actor.businessId });
  currentUid(expectedUid);
  const current = await getCurrentActor(); currentUid(expectedUid);
  if (current.businessId !== actor.businessId || response.bindingId !== state.bindingId || response.enabled !== true || !stillCurrent(state)) throw new InventoryError('unauthenticated', 'Device or business changed during registration');
  writeDevice({ ...state, state: 'enabled' }); return 'enabled';
}
export async function getPushNotificationState(): Promise<PushNotificationState> {
  if (!isNotificationsSupported()) return 'unsupported';
  const state = readDevice();
  if (state?.state === 'pending-disable') return 'pending-disable';
  if (Notification.permission === 'denied') return 'denied';
  if (!state || state.state !== 'enabled' || state.uid !== auth.currentUser?.uid) return 'disabled';
  const actor = await getCurrentActor(); currentUid(state.uid);
  if (actor.businessId !== state.businessId) return 'disabled';
  const registration = await readyWorker(); const subscription = await registration.pushManager.getSubscription(); currentUid(state.uid);
  if (!subscription || Notification.permission !== 'granted') return 'disabled';
  const response = await call<{ enabled: boolean }>('getPushDeviceStatus', { ...credentials(state), expectedActorUid: actor.uid, expectedBusinessId: actor.businessId });
  currentUid(state.uid); return response.enabled === true && stillCurrent(state) ? 'enabled' : 'disabled';
}
/** Compatibility lookup only; it never registers a worker or creates a subscription. */
export async function registerServiceWorker(): Promise<PushSubscription | null> {
  if (!isNotificationsSupported()) return null;
  return (await readyWorker()).pushManager.getSubscription();
}
export async function saveSubscription(userId: string, businessId: string, subscription: PushSubscription): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.uid !== userId || actor.businessId !== businessId) throw new InventoryError('permission-denied', 'Subscription belongs to another account');
  const state = readDevice();
  if (!state?.bindingId || state.uid !== actor.uid || state.businessId !== actor.businessId) throw new InventoryError('unavailable', 'Enable notifications explicitly first');
  await call('upsertPushDevice', { ...credentials(state), subscription: subscription.toJSON(), expectedActorUid: actor.uid, expectedBusinessId: actor.businessId });
}
// Retired compatibility exports: only the app worker displays server pushes.
// No page timers, new Notification, window-open message handler or fake send success.
const retired = (...args: unknown[]): null => { void args; return null; };
export const showLocalNotification = retired;
export const sendNotification = retired;
export const sendExpiredItemNotification = retired;
export const sendMultipleExpiredItemsNotification = retired;
export const sendDailySummaryNotification = retired;
export const sendShiftEndingNotification = retired;
export const sendShiftEndedNotification = retired;
export const setupNotificationClickHandlers = retired;
export const sendDiscardReminderNotification = retired;
export const sendAdminExpiredItemsNotification = retired;
export const sendEveningDiscardReminders = retired;
export const sendSingleExpiredItemNotification = retired;
