import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createUserService, UserOperationError, type UserProfile } from './users';

function hasCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export function firebaseUserService() {
  const store = getFirestore();
  const auth = getAuth();
  return createUserService({
    profiles: {
      withEmployeeLock: async (uid, work) => {
        const ref = store.doc(`employeeOperationLocks/${uid}`);
        const token = randomUUID();
        await store.runTransaction(async transaction => {
          const previous = (await transaction.get(ref)).data();
          if (previous && previous.leaseExpiresAt > Date.now()) throw new UserOperationError('aborted', 'Employee update is in progress; retry later');
          transaction.set(ref, { token, leaseExpiresAt: Date.now() + 300000 });
        });
        try { return await work(); }
        finally {
          await store.runTransaction(async transaction => {
            if ((await transaction.get(ref)).data()?.token === token) transaction.delete(ref);
          });
        }
      },
      get: async uid => {
        const snapshot = await store.doc(`users/${uid}`).get();
        return snapshot.exists ? { ...snapshot.data(), uid } as UserProfile : null;
      },
      update: async (uid, values) => {
        await store.doc(`users/${uid}`).update({ ...values, updatedAt: FieldValue.serverTimestamp() });
      },
      reserve: async (key, fingerprint, uid) => {
        const ref = store.doc(`provisionRequests/${key}`);
        return store.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref);
          const previous = snapshot.data();
          if (previous && previous.fingerprint !== fingerprint) throw new UserOperationError('already-exists', 'Request ID already used');
          if (previous?.status === 'complete') return 'complete';
          if (previous && previous.leaseExpiresAt > Date.now()) throw new UserOperationError('aborted', 'Provisioning is in progress; retry this request later');
          // Longer than the callable's 60-second deadline, so interrupted calls can resume.
          transaction.set(ref, { uid, fingerprint, status: 'pending', leaseExpiresAt: Date.now() + 300000 });
          return 'reserved';
        });
      },
      finish: async (key, profile) => {
        const batch = store.batch();
        batch.set(store.doc(`users/${profile.uid}`), { ...profile, createdAt: FieldValue.serverTimestamp() });
        batch.update(store.doc(`provisionRequests/${key}`), { status: 'complete', leaseExpiresAt: 0 });
        await batch.commit();
      },
      release: async key => { await store.doc(`provisionRequests/${key}`).delete(); },
    },
    accounts: {
      get: async uid => {
        try { return await auth.getUser(uid); }
        catch (error) { if (hasCode(error, 'auth/user-not-found')) return null; throw error; }
      },
      create: async input => { await auth.createUser(input); },
      remove: async uid => { await auth.deleteUser(uid); },
      enable: async uid => { await auth.updateUser(uid, { disabled: false }); },
      disable: async uid => {
        try { await auth.updateUser(uid, { disabled: true }); }
        catch (error) { if (!hasCode(error, 'auth/user-not-found')) throw error; }
      },
      revoke: async uid => {
        try { await auth.revokeRefreshTokens(uid); }
        catch (error) { if (!hasCode(error, 'auth/user-not-found')) throw error; }
      },
    },
  });
}
