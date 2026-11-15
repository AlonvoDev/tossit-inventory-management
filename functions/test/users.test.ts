import { describe, expect, it, vi } from 'vitest';
import { createUserService, type UserProfile, type UserDependencies } from '../src/users';

function setup() {
  const profiles = new Map<string, UserProfile>([
    ['admin', { uid: 'admin', fullName: 'Admin', email: 'admin@example.test', role: 'admin', department: 'bar', businessId: 'a', isActive: true }],
    ['staff', { uid: 'staff', fullName: 'Staff', email: 'staff@example.test', role: 'staff', department: 'bar', businessId: 'a', isActive: true }],
    ['foreign', { uid: 'foreign', fullName: 'Other', email: 'other@example.test', role: 'staff', department: 'bar', businessId: 'b', isActive: true }],
  ]);
  const accounts = new Map<string, { uid: string; email: string; disabled: boolean }>();
  const requests = new Map<string, { fingerprint: string; complete: boolean }>();
  let failProfileWrite = false;
  let failActivation = false;
  let loseProfileAcknowledgement = false;
  let holdActivation = false;
  let resumeActivation: (() => void) | undefined;
  const employeeLocks = new Set<string>();
  const deps: UserDependencies = {
    profiles: {
      withEmployeeLock: async (uid, work) => {
        if (employeeLocks.has(uid)) throw Object.assign(new Error('busy'), { code: 'aborted' });
        employeeLocks.add(uid);
        try { return await work(); } finally { employeeLocks.delete(uid); }
      },
      get: async uid => profiles.get(uid) ?? null,
      update: async (uid, values) => { profiles.set(uid, { ...profiles.get(uid)!, ...values }); },
      reserve: async (key, fingerprint) => {
        const old = requests.get(key);
        if (old && old.fingerprint !== fingerprint) throw Object.assign(new Error('request reused'), { code: 'already-exists' });
        if (old?.complete) return 'complete';
        if (old) throw Object.assign(new Error('busy'), { code: 'aborted' });
        requests.set(key, { fingerprint, complete: false });
        return 'reserved';
      },
      finish: async (key, profile) => {
        if (failProfileWrite) throw new Error('profile write unavailable');
        profiles.set(profile.uid, profile);
        requests.get(key)!.complete = true;
        if (loseProfileAcknowledgement) throw new Error('profile acknowledgement lost');
      },
      release: async key => { requests.delete(key); },
    },
    accounts: {
      get: async uid => accounts.get(uid) ?? null,
      create: async values => {
        if ([...accounts.values()].some(a => a.email === values.email)) throw Object.assign(new Error('email exists'), { code: 'auth/email-already-exists' });
        accounts.set(values.uid, { uid: values.uid, email: values.email, disabled: true });
      },
      remove: async uid => { accounts.delete(uid); },
      enable: async uid => {
        if (failActivation) throw new Error('activation unavailable');
        if (holdActivation) await new Promise<void>(resolve => { resumeActivation = resolve; });
        accounts.get(uid)!.disabled = false;
      },
      disable: async uid => { if (accounts.has(uid)) accounts.get(uid)!.disabled = true; },
      revoke: async () => undefined,
    },
  };
  return { service: createUserService(deps), profiles, accounts, requests,
    failWrites: () => { failProfileWrite = true; },
    failActivation: () => { failActivation = true; },
    loseProfileAcknowledgement: () => { loseProfileAcknowledgement = true; },
    holdActivation: () => { holdActivation = true; },
    activationWaiting: () => !!resumeActivation,
    resumeActivation: () => { holdActivation = false; resumeActivation?.(); },
    restore: () => { failProfileWrite = false; failActivation = false; loseProfileAcknowledgement = false; },
  };
}
const input = () => ({ requestId: 'request-12345678', fullName: 'New Employee', email: 'new@example.test', password: 'secure-test-password', role: 'staff', department: 'bar', expectedActorUid: 'admin', expectedBusinessId: 'a' });

describe('privileged employee operations', () => {
  it('denies signed-out, staff and disabled administrators', async () => {
    const x = setup();
    await expect(x.service.create(null, input())).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(x.service.create('staff', input())).rejects.toMatchObject({ code: 'permission-denied' });
    x.profiles.get('admin')!.isActive = false;
    await expect(x.service.create('admin', input())).rejects.toMatchObject({ code: 'permission-denied' });
    expect(x.accounts.size).toBe(0);
  });
  it('creates an account and scoped profile without changing the caller profile', async () => {
    const x = setup();
    const uid = await x.service.create('admin', input());
    expect(x.profiles.get(uid)).toMatchObject({ businessId: 'a', role: 'staff', department: 'bar', isActive: true, isOnShift: false });
    expect(x.accounts.get(uid)).toMatchObject({ email: 'new@example.test', disabled: false });
    expect(x.profiles.get('admin')).toMatchObject({ role: 'admin', uid: 'admin' });
  });
  it('returns the same account for a completed duplicate request', async () => {
    const x = setup();
    const first = await x.service.create('admin', input());
    expect(await x.service.create('admin', input())).toBe(first);
    expect(x.accounts.size).toBe(1);
  });
  it('rejects reusing a request ID for a different employee payload', async () => {
    const x = setup();
    await x.service.create('admin', input());
    await expect(x.service.create('admin', { ...input(), role: 'admin' })).rejects.toMatchObject({ code: 'already-exists' });
    expect(x.accounts.size).toBe(1);
  });
  it('rejects a manager with no assigned department', async () => {
    const x = setup();
    await expect(x.service.create('admin', { ...input(), role: 'manager', department: '' })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(x.accounts.size).toBe(0);
  });
  it('removes a newly created disabled account if writing the profile fails', async () => {
    const x = setup(); x.failWrites();
    await expect(x.service.create('admin', input())).rejects.toThrow('profile write unavailable');
    expect(x.accounts.size).toBe(0);
    expect(x.requests.size).toBe(0);
    expect(x.profiles.size).toBe(3);
    x.restore();
    await x.service.create('admin', input());
    expect(x.accounts.size).toBe(1);
  });
  it('can retry an activation failure without rewriting or duplicating the account', async () => {
    const x = setup(); x.failActivation();
    await expect(x.service.create('admin', input())).rejects.toThrow('activation unavailable');
    expect(x.accounts.size).toBe(1);
    expect([...x.accounts.values()][0].disabled).toBe(true);
    x.restore();
    const uid = await x.service.create('admin', input());
    expect(x.accounts.size).toBe(1);
    expect(x.accounts.get(uid)!.disabled).toBe(false);
  });
  it('never overwrites an existing email account belonging to a different request', async () => {
    const x = setup();
    x.accounts.set('existing', { uid: 'existing', email: 'new@example.test', disabled: false });
    await expect(x.service.create('admin', input())).rejects.toMatchObject({ code: 'auth/email-already-exists' });
    expect(x.accounts.get('existing')!.disabled).toBe(false);
    expect(x.accounts.size).toBe(1);
  });
  it('denies updates and deactivation across businesses', async () => {
    const x = setup();
    await expect(x.service.update('admin', 'foreign', { fullName: 'Changed' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(x.service.deactivate('admin', 'foreign')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(x.profiles.get('foreign')!.isActive).toBe(true);
  });
  it('deactivates the profile and account while preserving audit identity', async () => {
    const x = setup();
    x.accounts.set('staff', { uid: 'staff', email: 'staff@example.test', disabled: false });
    await x.service.deactivate('admin', 'staff');
    expect(x.profiles.get('staff')).toMatchObject({ uid: 'staff', isActive: false, isOnShift: false });
    expect(x.accounts.get('staff')!.disabled).toBe(true);
  });
  it('prevents accidental self-deactivation and changing own role', async () => {
    const x = setup();
    await expect(x.service.deactivate('admin', 'admin')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(x.service.update('admin', 'admin', { role: 'staff', department: 'bar' })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('updates a manager department and rejects non-whitelisted fields', async () => {
    const x = setup();
    await x.service.update('admin', 'staff', { role: 'manager', department: 'kitchen' });
    expect(x.profiles.get('staff')).toMatchObject({ role: 'manager', department: 'kitchen' });
    await expect(x.service.update('admin', 'staff', { businessId: 'b' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });
  it('never reactivates a subsequently disabled employee by replaying old provisioning', async () => {
    const x = setup();
    const uid = await x.service.create('admin', input());
    await x.service.deactivate('admin', uid);
    await expect(x.service.create('admin', input())).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(x.accounts.get(uid)!.disabled).toBe(true);
  });
  it('preserves the account when a committed profile write loses its acknowledgement', async () => {
    const x = setup(); x.loseProfileAcknowledgement();
    await expect(x.service.create('admin', input())).rejects.toThrow('profile acknowledgement lost');
    expect(x.accounts.size).toBe(1);
    expect(x.profiles.size).toBe(4);
    x.restore();
    const uid = await x.service.create('admin', input());
    expect(x.accounts.size).toBe(1);
    expect(x.accounts.get(uid)!.disabled).toBe(false);
  });
  it('rejects an intent authenticated as a different business administrator', async () => {
    const x = setup();
    x.profiles.set('admin-b', { ...x.profiles.get('admin')!, uid: 'admin-b', businessId: 'b' });
    await expect(x.service.create('admin-b', input())).rejects.toMatchObject({ code: 'permission-denied' });
    expect(x.accounts.size).toBe(0);
  });
  it('coordinates activation replay and deactivation so a completed disable cannot be undone', async () => {
    const x = setup();
    const uid = await x.service.create('admin', input());
    x.holdActivation();
    const replay = x.service.create('admin', input());
    await vi.waitFor(() => expect(x.activationWaiting()).toBe(true));
    const outcome = await x.service.deactivate('admin', uid).then(() => 'deactivated', error => error.code);
    x.resumeActivation();
    await replay;
    expect(outcome).toBe('aborted');
    await x.service.deactivate('admin', uid);
    expect(x.profiles.get(uid)!.isActive).toBe(false);
    expect(x.accounts.get(uid)!.disabled).toBe(true);
  });
});
