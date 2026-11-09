import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin, getApp, type App as AdminApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminStore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';

const projectId = 'demo-tossit-auth';
let admin: AdminApp;
let client: FirebaseApp;
let functions: Functions;
let server: Server | undefined;
const uids = new Set<string>();
const ownerUid = `owner-${randomUUID()}`;
const password = 'emulator-test-password';
const ownerEmail = `${ownerUid}@example.test`;

beforeAll(async () => {
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    const host = process.env[name];
    if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error(`Local emulator required: ${name}`);
  }
  admin = initializeAdmin({ projectId }, `test-${randomUUID()}`);
  // Exercise the real onCall HTTP/auth wrapper over loopback TCP. The Firebase
  // CLI worker uses Unix sockets, unavailable in some managed test environments.
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId });
  if (process.env.TOSSIT_NATIVE_FUNCTIONS_EMULATOR !== 'true') {
    const handlers = await import('../src/index');
    const app = express();
    app.use(express.json());
    app.post(`/${projectId}/us-central1/createEmployee`, handlers.createEmployee);
    app.post(`/${projectId}/us-central1/updateEmployee`, handlers.updateEmployee);
    app.post(`/${projectId}/us-central1/deactivateEmployee`, handlers.deactivateEmployee);
    app.post(`/${projectId}/us-central1/upsertPushDevice`, handlers.upsertPushDevice);
    app.post(`/${projectId}/us-central1/revokePushDevice`, handlers.revokePushDevice);
    app.post(`/${projectId}/us-central1/getPushDeviceStatus`, handlers.getPushDeviceStatus);
    await new Promise<void>(resolve => { server = app.listen(5001, '127.0.0.1', resolve); });
  }
  const store = adminStore(admin);
  await adminAuth(admin).createUser({ uid: ownerUid, email: ownerEmail, password });
  uids.add(ownerUid);
  await store.doc(`users/${ownerUid}`).set({ uid: ownerUid, fullName: 'Test Admin', email: ownerEmail, businessId: 'integration-a', role: 'admin', department: 'bar', isActive: true });
  client = initializeApp({ projectId, apiKey: 'emulator-key', authDomain: `${projectId}.firebaseapp.com` }, randomUUID());
  connectAuthEmulator(getAuth(client), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  functions = getFunctions(client, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  await signInWithEmailAndPassword(getAuth(client), ownerEmail, password);
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  if (admin) {
    for (const name of ['pushDevices', 'pushEndpointClaims', 'pushRevocations', 'notificationDeliveries']) {
      for (const doc of (await adminStore(admin).collection(name).get()).docs) await doc.ref.delete();
    }
    await adminStore(admin).doc('items/push-expired-fixture').delete();
    await adminStore(admin).doc('businessSettings/integration-a').delete();
    for (const uid of uids) {
      await adminStore(admin).doc(`users/${uid}`).delete();
      await adminAuth(admin).deleteUser(uid).catch(() => undefined);
    }
    await deleteAdmin(admin);
    if (process.env.TOSSIT_NATIVE_FUNCTIONS_EMULATOR !== 'true') await deleteAdmin(getApp());
  }
  if (client) await deleteApp(client);
});

describe('real callable provisioning against local emulators', () => {
  it('authorizes the actor, provisions idempotently and keeps the admin signed in', async () => {
    const input = { requestId: randomUUID(), fullName: 'Kitchen Manager', email: `employee-${randomUUID()}@example.test`, password, role: 'manager', department: 'kitchen', businessId: 'forged-ignored', expectedActorUid: ownerUid, expectedBusinessId: 'integration-a' };
    const create = httpsCallable<typeof input, { uid: string }>(functions, 'createEmployee');
    const first = (await create(input)).data.uid;
    uids.add(first);
    expect((await create(input)).data.uid).toBe(first);
    expect(getAuth(client).currentUser?.uid).toBe(ownerUid);
    expect((await adminStore(admin).doc(`users/${first}`).get()).data()).toMatchObject({ uid: first, role: 'manager', department: 'kitchen', businessId: 'integration-a', isActive: true });
    expect((await adminAuth(admin).getUser(first)).disabled).toBe(false);

    await signInWithEmailAndPassword(getAuth(client), input.email, password);
    await expect(create({ ...input, requestId: randomUUID(), email: `denied-${randomUUID()}@example.test` })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await signInWithEmailAndPassword(getAuth(client), ownerEmail, password);

    await httpsCallable(functions, 'deactivateEmployee')({ uid: first });
    expect((await adminAuth(admin).getUser(first)).disabled).toBe(true);
    expect((await adminStore(admin).doc(`users/${first}`).get()).data()).toMatchObject({ isActive: false, isOnShift: false });
    await expect(create(input)).rejects.toMatchObject({ code: 'functions/failed-precondition' });
    expect((await adminAuth(admin).getUser(first)).disabled).toBe(true);
  });
});

describe('real push callables and scheduler persistence', () => {
  it('binds devices with capabilities, blocks endpoint takeover and supports fenced signed-out cleanup', async () => {
    const { createECDH } = await import('node:crypto'); const key = createECDH('prime256v1'); key.generateKeys();
    await signInWithEmailAndPassword(getAuth(client), ownerEmail, password);
    const input = { deviceId: `device-${randomUUID()}`, deviceToken: randomUUID() + randomUUID(), bindingId: `binding-${randomUUID()}`, expectedActorUid: ownerUid, expectedBusinessId: 'integration-a', subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, expirationTime: null, keys: { p256dh: key.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') } } };
    const register = httpsCallable(functions, 'upsertPushDevice'); const revoke = httpsCallable(functions, 'revokePushDevice'); const status = httpsCallable(functions, 'getPushDeviceStatus');
    await register(input); await register(input);
    const store = adminStore(admin);
    expect((await store.doc(`pushDevices/${input.deviceId}`).get()).data()).toMatchObject({ uid: ownerUid, businessId: 'integration-a', enabled: true });
    await expect(register({ ...input, deviceToken: 'wrong'.repeat(16) })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await expect(register({ ...input, deviceId: `device-${randomUUID()}` })).rejects.toMatchObject({ code: 'functions/already-exists' });
    const next = { ...input, bindingId: `binding-${randomUUID()}` }; await register(next);
    expect((await revoke(input)).data).toEqual({ revoked: false });
    await expect(register(input)).rejects.toMatchObject({ code: 'functions/failed-precondition' });
    expect((await status(next)).data).toEqual({ enabled: true });
    const { signOut } = await import('firebase/auth'); await signOut(getAuth(client));
    expect((await revoke(next)).data).toEqual({ revoked: true });
    expect((await store.doc(`pushDevices/${input.deviceId}`).get()).data()!.enabled).toBe(false);
    await signInWithEmailAndPassword(getAuth(client), ownerEmail, password);
    const cancelled = { ...input, deviceId: `device-${randomUUID()}`, bindingId: `binding-${randomUUID()}`, subscription: { ...input.subscription, endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}` } };
    await revoke(cancelled); // Cancellation can arrive before an in-flight registration.
    await expect(register(cancelled)).rejects.toMatchObject({ code: 'functions/failed-precondition' });
  });
  it('uses actual Firestore delivery claims to deduplicate and ends shifts only with opt-in and a safe cutoff', async () => {
    const { firebaseNotificationService } = await import('../src/firebaseNotifications');
    const { israelSlot } = await import('../src/notifications');
    const { Timestamp } = await import('firebase-admin/firestore');
    const { createECDH } = await import('node:crypto'); const key = createECDH('prime256v1'); key.generateKeys();
    const store = adminStore(admin); const at = Date.parse('2026-11-10T06:00:00Z');
    const sends: unknown[] = [];
    const service = firebaseNotificationService({ store, now: () => at, send: async (_sub, payload) => { sends.push(payload); } });
    const input = { deviceId: `device-${randomUUID()}`, deviceToken: randomUUID() + randomUUID(), bindingId: `binding-${randomUUID()}`, expectedActorUid: ownerUid, expectedBusinessId: 'integration-a', subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, keys: { p256dh: key.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 3).toString('base64url') } } };
    await service.register(ownerUid, input);
    await store.doc('items/push-expired-fixture').set({ businessId: 'integration-a', area: 'bar', expiryTime: Timestamp.fromMillis(at - 86400000), finished: false, discarded: false, isThrown: false });
    const slot = israelSlot(new Date(at))!;
    await Promise.all([service.run(slot), service.run(slot)]); expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({ version: 1, url: '/dashboard' });
    const midnightAt = Date.parse('2026-11-09T22:00:00Z'); const midnight = israelSlot(new Date(midnightAt))!;
    const midnightService = firebaseNotificationService({ store, now: () => midnightAt, send: async () => { throw new Error('No midnight push should be sent'); } });
    await store.doc(`users/${ownerUid}`).update({ isOnShift: true, shiftStartedAt: Timestamp.fromMillis(midnightAt - 3600000) });
    await midnightService.run(midnight); expect((await store.doc(`users/${ownerUid}`).get()).data()!.isOnShift).toBe(true);
    await store.doc('businessSettings/integration-a').set({ timezone: 'Asia/Jerusalem', eveningRemindersEnabled: true, morningSummaryEnabled: true, autoEndShiftsAtMidnight: true });
    await midnightService.run(midnight); expect((await store.doc(`users/${ownerUid}`).get()).data()!.isOnShift).toBe(false);
    await store.doc(`users/${ownerUid}`).update({ isOnShift: true, shiftStartedAt: Timestamp.fromMillis(midnightAt + 1000) });
    await midnightService.run(midnight); expect((await store.doc(`users/${ownerUid}`).get()).data()!.isOnShift).toBe(true);
  });
});
