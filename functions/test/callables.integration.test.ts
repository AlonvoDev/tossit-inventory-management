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
  const handlers = await import('../src/index');
  const app = express();
  app.use(express.json());
  app.post(`/${projectId}/us-central1/createEmployee`, handlers.createEmployee);
  app.post(`/${projectId}/us-central1/updateEmployee`, handlers.updateEmployee);
  app.post(`/${projectId}/us-central1/deactivateEmployee`, handlers.deactivateEmployee);
  await new Promise<void>(resolve => { server = app.listen(5001, '127.0.0.1', resolve); });
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
    for (const uid of uids) {
      await adminStore(admin).doc(`users/${uid}`).delete();
      await adminAuth(admin).deleteUser(uid).catch(() => undefined);
    }
    await deleteAdmin(admin);
    await deleteAdmin(getApp());
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
