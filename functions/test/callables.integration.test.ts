import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin, getApp, type App as AdminApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminStore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable, httpsCallableFromURL, type Functions } from 'firebase/functions';

const projectId = 'demo-tossit-auth';
let admin: AdminApp;
let client: FirebaseApp;
let functions: Functions;
let server: Server | undefined;
let bundleDirectory: string | undefined;
let bundleServer: ChildProcess | undefined;
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
    const app = express();
    app.use(express.json());
    if (process.env.TOSSIT_CALLABLE_HOST?.startsWith('neon')) {
      process.env.TOSSIT_SERVER_EMULATORS = 'true';
      process.env.TOSSIT_FIREBASE_PROJECT_ID = projectId;
      const { createHttpHandler } = await import('../src/hosting/http');
      const { hostingServices } = await import('../src/hosting/services');
      const handler = createHttpHandler({ ...hostingServices(), allowedOrigins: [], parseTrigger: () => null });
      if (process.env.TOSSIT_CALLABLE_HOST === 'neon-bundle') {
        bundleDirectory = await mkdtemp(join(tmpdir(),'tossit-neon-bundle-'));
        const bundlePath=join(bundleDirectory,'index.mjs');
        await copyFile('functions/dist-neon/index.mjs',bundlePath);
        bundleServer=spawn(process.execPath,['functions/scripts/serve-test-bundle.mjs',bundlePath],{env:process.env,stdio:['ignore','pipe','pipe']});
        await new Promise<void>((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Bundle host start timed out')),10000);
          bundleServer!.stdout!.on('data',data=>{if(String(data).includes('tossit-test-host-ready')){clearTimeout(timer);resolve();}});
          bundleServer!.on('error',reject);bundleServer!.on('exit',code=>{clearTimeout(timer);if(code!==null)reject(new Error('Bundle host failed to start'));});
        });
      } else {
      app.post(/.*/, async (req,res) => {
        const headers = new Headers();
        for (const [key,value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key,value);
        const path = req.path.replace(`/${projectId}/us-central1`, '');
        const reply = await handler(new Request('http://127.0.0.1:5001'+path,{method:'POST',headers,body:JSON.stringify(req.body)}));
        reply.headers.forEach((value,key)=>res.setHeader(key,value));
        res.status(reply.status).send(await reply.text());
      });
      }
    } else {
    const handlers = await import('../src/index');
    app.post(`/${projectId}/us-central1/createEmployee`, handlers.createEmployee);
    app.post(`/${projectId}/us-central1/updateEmployee`, handlers.updateEmployee);
    app.post(`/${projectId}/us-central1/deactivateEmployee`, handlers.deactivateEmployee);
    app.post(`/${projectId}/us-central1/upsertPushDevice`, handlers.upsertPushDevice);
    app.post(`/${projectId}/us-central1/revokePushDevice`, handlers.revokePushDevice);
    app.post(`/${projectId}/us-central1/getPushDeviceStatus`, handlers.getPushDeviceStatus);
    }
    if (!bundleServer) await new Promise<void>(resolve => { server = app.listen(5001, '127.0.0.1', resolve); });
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
  if (bundleServer && bundleServer.exitCode === null && bundleServer.signalCode === null) { const stopped=new Promise<void>(resolve=>bundleServer!.once('exit',()=>resolve()));bundleServer.kill('SIGTERM');await stopped; }
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
    if (process.env.TOSSIT_NATIVE_FUNCTIONS_EMULATOR !== 'true' && !bundleServer) await deleteAdmin(getApp());
  }
  if (client) await deleteApp(client);
  if (bundleDirectory) await rm(bundleDirectory,{recursive:true,force:true});
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

// The host-neutral adapter additionally rejects disabled/revoked identities before domain work.
describe('Neon host verified token boundary', () => {
  beforeEach(async()=>{if(process.env.TOSSIT_CALLABLE_HOST?.startsWith('neon'))await signInWithEmailAndPassword(getAuth(client),ownerEmail,password);});
  it.runIf(process.env.TOSSIT_CALLABLE_HOST?.startsWith('neon'))('rejects expired and revoked tokens on privileged writes and capability revoke', async () => {
    await signInWithEmailAndPassword(getAuth(client),ownerEmail,password);
    const token=await getAuth(client).currentUser!.getIdToken();
    const [header,payload]=token.split('.');const claims=JSON.parse(Buffer.from(payload,'base64url').toString());
    const expired=header+'.'+Buffer.from(JSON.stringify({...claims,exp:Math.floor(Date.now()/1000)-60})).toString('base64url')+'.';
    const {createECDH}=await import('node:crypto');const key=createECDH('prime256v1');key.generateKeys();
    const binding={deviceId:`token-device-${randomUUID()}`,deviceToken:randomUUID()+randomUUID(),bindingId:`binding-${randomUUID()}`,expectedActorUid:ownerUid,expectedBusinessId:'integration-a',subscription:{endpoint:`https://fcm.googleapis.com/fcm/send/${randomUUID()}`,keys:{p256dh:key.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,3).toString('base64url')}}};
    await httpsCallable(functions,'upsertPushDevice')(binding);
    const submit=(name:string,value:unknown,bearer:string)=>fetch(`http://127.0.0.1:5001/${projectId}/us-central1/${name}`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+bearer},body:JSON.stringify({data:value})});
    const before=(await adminStore(admin).collection('users').get()).size;
    const createInput={requestId:randomUUID(),fullName:'Must not exist',email:`expired-${randomUUID()}@example.test`,password,role:'staff',department:'bar',expectedActorUid:ownerUid,expectedBusinessId:'integration-a'};
    expect((await submit('createEmployee',createInput,expired)).status).toBe(401);
    expect((await submit('revokePushDevice',binding,expired)).status).toBe(401);
    await expect.poll(()=>Math.floor(Date.now()/1000)).toBeGreaterThan(Number(claims.auth_time));
    await adminAuth(admin).revokeRefreshTokens(ownerUid);
    const revoked=await submit('revokePushDevice',binding,token);expect(revoked.status).toBe(401);expect(await revoked.json()).toMatchObject({error:{status:'UNAUTHENTICATED'}});
    expect((await adminStore(admin).doc(`pushDevices/${binding.deviceId}`).get()).data()!.enabled).toBe(true);
    expect((await adminStore(admin).collection('users').get()).size).toBe(before);
  });

  it.runIf(process.env.TOSSIT_CALLABLE_HOST?.startsWith('neon'))('uses the real SDK with an explicit non-Google callable URL', async () => {
    const create = httpsCallableFromURL<unknown,{uid:string}>(functions,'http://127.0.0.1:5001/createEmployee');
    const input={requestId:randomUUID(),fullName:'Hosted Staff',email:`hosted-${randomUUID()}@example.test`,password,role:'staff',department:'bar',expectedActorUid:ownerUid,expectedBusinessId:'integration-a'};
    const result=await create(input);uids.add(result.data.uid);
    expect((await create(input)).data.uid).toBe(result.data.uid);
    await expect(create({...input,requestId:randomUUID()})).rejects.toMatchObject({code:'functions/already-exists'});
    expect((await adminStore(admin).doc(`users/${result.data.uid}`).get()).data()).toMatchObject({role:'staff',businessId:'integration-a'});
  });

  it.runIf(process.env.TOSSIT_CALLABLE_HOST?.startsWith('neon'))('rejects forged and disabled user tokens through the real HTTP adapter', async () => {
    const endpoint = `http://127.0.0.1:5001/${projectId}/us-central1/getPushDeviceStatus`;
    const forged = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer forged'},body:JSON.stringify({data:{}})});
    expect(forged.status).toBe(401);
    await adminAuth(admin).updateUser(ownerUid,{disabled:true});
    try { await expect(httpsCallable(functions,'getPushDeviceStatus')({})).rejects.toMatchObject({code:'functions/unauthenticated'}); }
    finally { await adminAuth(admin).updateUser(ownerUid,{disabled:false}); }
  });
});
