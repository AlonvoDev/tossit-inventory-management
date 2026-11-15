import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { createUserByAdmin, getUserProfile, signUp, startShift, updateUserRoleToAdmin } from '../../api/authAPI';

const state = vi.hoisted(() => ({
  user: { uid: 'admin' } as User,
  documents: new Map<string, Record<string, unknown>>(),
  calls: [] as { name: string; data: Record<string, unknown> }[],
  failures: 0,
  holdProfile: false,
  resumeProfile: undefined as undefined | (() => void),
}));
vi.mock('../../services/firebase', () => ({
  db: {}, firebaseApp: {}, functions: {}, googleProvider: {}, enhancedSignIn: vi.fn(),
  auth: { get currentUser() { return state.user; } },
}));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: async () => {
    state.user = { uid: 'client-created-user' } as User;
    return { user: state.user };
  },
  updateProfile: async () => undefined,
}));
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_functions: unknown, name: string) => async (data: Record<string, unknown>) => {
    state.calls.push({ name, data });
    if (state.failures-- > 0) throw Object.assign(new Error('unavailable'), { code: 'functions/unavailable' });
    return { data: { uid: 'server-created-user' } };
  },
}));
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (_db: unknown, collection: string, uid: string) => `${collection}/${uid}`,
    getDoc: async (path: string) => {
      if (state.holdProfile) await new Promise<void>(resolve => { state.resumeProfile = resolve; });
      return { exists: () => state.documents.has(path), data: () => state.documents.get(path) };
    },
    setDoc: async (path: string, data: Record<string, unknown>) => { state.documents.set(path, { ...state.documents.get(path), ...data }); },
    updateDoc: async (path: string, data: Record<string, unknown>) => { state.documents.set(path, { ...state.documents.get(path), ...data }); },
    serverTimestamp: () => ({ serverTimestamp: true }),
  };
});
const data = () => ({ fullName: 'New staff', email: 'new@example.test', password: 'test-password', role: 'staff' as const, department: 'bar' as const });
beforeEach(() => {
  state.user = { uid: 'admin' } as User;
  state.calls = []; state.failures = 0; state.documents.clear();
  state.holdProfile = false; state.resumeProfile = undefined;
  state.documents.set('users/admin', { uid: 'admin', fullName: 'Admin', email: 'admin@example.test', role: 'admin', department: 'bar', businessId: 'a' });
});
describe('client auth API boundaries', () => {
  it('cannot create privileged profiles through public signup', async () => {
    await expect(signUp('new@example.test', 'test-password', 'New', 'a', true)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.user.uid).toBe('admin');
    expect(state.documents.size).toBe(1);
  });
  it('returns no authority for a missing profile rather than creating an admin', async () => {
    expect(await getUserProfile('missing')).toBeNull();
    expect(state.documents.has('users/missing')).toBe(false);
  });
  it('rejects the old self-promotion helper without editing the user', async () => {
    await expect(updateUserRoleToAdmin('admin')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.documents.get('users/admin')).not.toHaveProperty('updatedAt');
  });
  it('creates employees through the server without replacing the current user', async () => {
    expect(await createUserByAdmin(data(), 'a')).toBe('server-created-user');
    expect(state.user.uid).toBe('admin');
    expect(state.calls[0]).toMatchObject({ name: 'createEmployee', data: { role: 'staff', department: 'bar', expectedActorUid: 'admin', expectedBusinessId: 'a' } });
  });
  it('reuses the request ID if an ambiguous provisioning failure is retried', async () => {
    state.failures = 1;
    await expect(createUserByAdmin(data(), 'a')).rejects.toThrow('unavailable');
    await createUserByAdmin(data(), 'a');
    expect(state.calls[0].data.requestId).toBeTruthy();
    expect(state.calls[1].data.requestId).toBe(state.calls[0].data.requestId);
  });
  it('rejects a stale UI business before provisioning', async () => {
    await expect(createUserByAdmin(data(), 'b')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.calls).toHaveLength(0);
  });
  it('writes a server-timestamped shift only for the current identity', async () => {
    await startShift('admin');
    expect(state.documents.get('users/admin')).toMatchObject({ isOnShift: true, shiftStartedAt: { serverTimestamp: true } });
    await expect(startShift('someone-else')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.documents.has('users/someone-else')).toBe(false);
  });
  it('cancels a stale create intent if the identity changes while loading its profile', async () => {
    state.holdProfile = true;
    const pending = createUserByAdmin(data(), 'a');
    state.user = { uid: 'admin-b' } as User;
    state.resumeProfile?.();
    await expect(pending).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.calls).toHaveLength(0);
  });
});
