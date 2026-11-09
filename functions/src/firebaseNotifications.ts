import { getFirestore, FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import * as webpush from 'web-push';
import { createNotificationService, digest, PushError, settingsValues, validProfile, validateSubscription, type NotificationDependencies, type PushDevice, type NotificationSlot } from './notifications';
const stamp = () => FieldValue.serverTimestamp();
function millis(value: unknown): number {
  try { return value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function' ? value.toMillis() : NaN; } catch { return NaN; }
}
export function firebaseNotificationService(options: { store?: Firestore; send?: NotificationDependencies['send']; now?: () => number } = {}) {
  const store = options.store ?? getFirestore();
  const now = options.now ?? Date.now;
  const deviceRef = (id: string) => store.doc(`pushDevices/${id}`);
  const claimRef = (endpoint: string) => store.doc(`pushEndpointClaims/${digest(endpoint)}`);
  const cancellationRef = (id: string, bindingId: string, capabilityHash: string) => store.doc(`pushRevocations/${digest(JSON.stringify([id, bindingId, capabilityHash]))}`);
  async function revoke(id: string, bindingId: string, capabilityHash?: string, allowMissing = false): Promise<boolean> {
    return store.runTransaction(async tx => {
      const ref = deviceRef(id); const old = (await tx.get(ref)).data() as PushDevice | undefined;
      if (!old) {
        if (!allowMissing || !capabilityHash) throw new PushError('failed-precondition', 'Device registration may still be pending; retain cleanup and retry');
        tx.set(cancellationRef(id, bindingId, capabilityHash), { cancelledAt: stamp(), expiresAt: Timestamp.fromMillis(now() + 14 * 86400000) });
        return false;
      }
      if (capabilityHash !== undefined && old.capabilityHash !== capabilityHash) throw new PushError('permission-denied', 'Device capability does not match');
      if (old.bindingId !== bindingId) {
        tx.set(cancellationRef(id, bindingId, old.capabilityHash), { cancelledAt: stamp(), expiresAt: Timestamp.fromMillis(now() + 14 * 86400000) });
        return false;
      }
      const endpoint = claimRef(old.subscription.endpoint); const claim = (await tx.get(endpoint)).data();
      tx.set(cancellationRef(id, bindingId, old.capabilityHash), { cancelledAt: stamp(), expiresAt: Timestamp.fromMillis(now() + 14 * 86400000) });
      tx.update(ref, { enabled: false, updatedAt: stamp() });
      if (claim?.deviceId === id && claim.bindingId === bindingId) tx.delete(endpoint);
      return true;
    });
  }
  const deps: NotificationDependencies = {
    profile: async uid => { const snapshot = await store.doc(`users/${uid}`).get(); return snapshot.exists ? { ...snapshot.data(), uid } : null; },
    devices: {
      list: async () => (await store.collection('pushDevices').where('enabled', '==', true).get()).docs.map(doc => ({ ...doc.data(), id: doc.id } as PushDevice)),
      get: async id => { const doc = await deviceRef(id).get(); return doc.exists ? { ...doc.data(), id: doc.id } as PushDevice : null; },
      put: async device => store.runTransaction(async tx => {
        const ref = deviceRef(device.id); const endpoint = claimRef(device.subscription.endpoint);
        const [oldDoc, profileDoc, claimDoc, owned, cancelled] = await Promise.all([tx.get(ref), tx.get(store.doc(`users/${device.uid}`)), tx.get(endpoint), tx.get(store.collection('pushDevices').where('uid', '==', device.uid)), tx.get(cancellationRef(device.id, device.bindingId, device.capabilityHash))]);
        const old = oldDoc.data() as PushDevice | undefined;
        const profile: Record<string, unknown> | null = profileDoc.exists ? { ...profileDoc.data(), uid: profileDoc.id } : null;
        if (!validProfile(profile) || profile?.businessId !== device.businessId) throw new PushError('permission-denied', 'Profile changed before device registration');
        if (cancelled.exists) throw new PushError('failed-precondition', 'This device binding was cancelled; use a fresh explicit opt-in');
        if (old && old.capabilityHash !== device.capabilityHash) throw new PushError('permission-denied', 'Device capability does not match');
        if (old?.bindingId === device.bindingId) {
          if (old.uid !== device.uid || old.businessId !== device.businessId || JSON.stringify(old.subscription) !== JSON.stringify(device.subscription)) throw new PushError('invalid-argument', 'Binding ID already belongs to another subscription intent');
          if (!old.enabled) throw new PushError('failed-precondition', 'Disabled bindings require a fresh explicit opt-in');
          return old;
        }
        if (claimDoc.exists && claimDoc.data()?.deviceId !== device.id) throw new PushError('already-exists', 'Endpoint already belongs to another device');
        if (owned.docs.filter(doc => doc.id !== device.id && doc.data().enabled === true).length >= 10) throw new PushError('failed-precondition', 'Device limit reached');
        let oldEndpoint: ReturnType<typeof claimRef> | undefined;
        let oldClaim: Record<string, unknown> | undefined;
        if (old && old.subscription.endpoint !== device.subscription.endpoint) { oldEndpoint = claimRef(old.subscription.endpoint); oldClaim = (await tx.get(oldEndpoint)).data(); }
        tx.set(ref, { ...device, createdAt: oldDoc.data()?.createdAt ?? stamp(), updatedAt: stamp() });
        tx.set(endpoint, { deviceId: device.id, bindingId: device.bindingId });
        if (oldEndpoint && oldClaim?.deviceId === device.id) tx.delete(oldEndpoint);
        return device;
      }),
      revoke: (id, capabilityHash, bindingId, allowMissing) => revoke(id, bindingId, capabilityHash, allowMissing),
      invalidate: async (id, bindingId) => { await revoke(id, bindingId); },
    },
    context: async device => {
      const [profileDoc, settingsDoc] = await Promise.all([store.doc(`users/${device.uid}`).get(), store.doc(`businessSettings/${device.businessId}`).get()]);
      const profile: Record<string, unknown> | null = profileDoc.exists ? { ...profileDoc.data(), uid: profileDoc.id } : null;
      const settings = settingsDoc.exists ? settingsDoc.data()! : null;
      if (!validProfile(profile) || profile?.businessId !== device.businessId) return { profile, settings, items: [] };
      const dept = profile!.department === 'bar' || profile!.department === 'בר' ? ['bar', 'בר'] : ['kitchen', 'מטבח'];
      const base = store.collection('items').where('businessId', '==', device.businessId);
      const records = await (profile!.role === 'admin' ? base : base.where('area', 'in', dept)).get();
      return { profile, settings, items: records.docs.map(doc => {
        const data = doc.data(); return { id: doc.id, businessId: data.businessId as string, area: data.area, expiryMs: millis(data.expiryTime), finished: data.finished === true, discarded: data.discarded === true, isThrown: data.isThrown === true };
      }) };
    },
    jobs: {
      claim: async (id, token, at) => store.runTransaction(async tx => {
        const ref = store.doc(`notificationDeliveries/${id}`); const old = (await tx.get(ref)).data();
        if (old && old.state !== 'retry' && (old.state !== 'sending' || old.leaseUntil > at)) return false;
        tx.set(ref, { state: 'sending', token, leaseUntil: at + 360000, attempts: (old?.attempts ?? 0) + 1, updatedAt: stamp(), expiresAt: Timestamp.fromMillis(at + 14 * 86400000) }); return true;
      }),
      finish: async (id, token, state) => store.runTransaction(async tx => {
        const ref = store.doc(`notificationDeliveries/${id}`); const job = (await tx.get(ref)).data();
        if (job?.token !== token || job.state !== 'sending') return false;
        tx.update(ref, { state, leaseUntil: 0, updatedAt: stamp() }); return true;
      }),
      release: async (id, token) => { await store.runTransaction(async tx => {
        const ref = store.doc(`notificationDeliveries/${id}`); const job = (await tx.get(ref)).data();
        if (job?.token === token && job.state === 'sending') tx.update(ref, { state: 'retry', leaseUntil: 0, updatedAt: stamp() });
      }); },
    },
    async endShifts(slot: NotificationSlot) {
      const settings = await store.collection('businessSettings').where('autoEndShiftsAtMidnight', '==', true).get();
      for (const business of settings.docs) {
        if (!settingsValues(business.data()).autoEndShiftsAtMidnight) continue;
        const staff = await store.collection('users').where('businessId', '==', business.id).get();
        for (const candidate of staff.docs) await store.runTransaction(async tx => {
          const [profileDoc, settingDoc] = await Promise.all([tx.get(candidate.ref), tx.get(business.ref)]);
          const profile = profileDoc.data(); const start = millis(profile?.shiftStartedAt);
          if (!settingDoc.exists || !settingsValues(settingDoc.data()!).autoEndShiftsAtMidnight || profile?.businessId !== business.id || profile.isOnShift !== true || !Number.isFinite(start) || start > slot.atMs) return;
          tx.update(candidate.ref, { isOnShift: false, shiftStartedAt: null, shiftEndedAt: stamp(), shiftEndReason: 'scheduled-midnight', shiftEndSlot: slot.id });
        });
      }
    },
    send: options.send ?? (async (subscription, payload) => {
      validateSubscription(subscription); // Also defend against malformed stored endpoint data.
      const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
      const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
      const subject = process.env.WEB_PUSH_CONTACT;
      if (!publicKey || !privateKey || !subject || !/^(mailto:|https:\/\/)/.test(subject)) throw new Error('Web Push deployment configuration is missing');
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 600, timeout: 10000, urgency: 'normal', vapidDetails: { subject, publicKey, privateKey } });
    }), now,
  };
  return createNotificationService(deps);
}
