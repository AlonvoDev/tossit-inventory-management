import { createHash } from 'node:crypto';

export type Role = 'admin' | 'manager' | 'staff';
export type Department = 'bar' | 'kitchen';
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  department: Department;
  businessId: string;
  isActive?: boolean;
  isOnShift?: boolean;
  phoneNumber?: string;
}
export class UserOperationError extends Error {
  constructor(public readonly code: 'unauthenticated' | 'permission-denied' | 'invalid-argument' | 'failed-precondition' | 'already-exists' | 'aborted', message: string) {
    super(message);
  }
}
export interface UserDependencies {
  profiles: {
    withEmployeeLock<T>(uid: string, work: () => Promise<T>): Promise<T>;
    get(uid: string): Promise<UserProfile | null>;
    update(uid: string, values: Partial<UserProfile> & { shiftStartedAt?: null }): Promise<void>;
    reserve(key: string, fingerprint: string, uid: string): Promise<'reserved' | 'complete'>;
    finish(key: string, profile: UserProfile): Promise<void>;
    release(key: string): Promise<void>;
  };
  accounts: {
    get(uid: string): Promise<{ uid: string; email?: string; disabled: boolean } | null>;
    create(input: { uid: string; email: string; password: string; displayName: string; disabled: true }): Promise<void>;
    remove(uid: string): Promise<void>;
    enable(uid: string): Promise<void>;
    disable(uid: string): Promise<void>;
    revoke(uid: string): Promise<void>;
  };
}
function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new UserOperationError('invalid-argument', `Invalid ${field}`);
  }
  return value.trim();
}
function role(value: unknown): Role {
  if (value !== 'admin' && value !== 'manager' && value !== 'staff') throw new UserOperationError('invalid-argument', 'Invalid role');
  return value;
}
function department(value: unknown): Department {
  if (value !== 'bar' && value !== 'kitchen') throw new UserOperationError('invalid-argument', 'An assigned department is required');
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UserOperationError('invalid-argument', 'Invalid request');
  return value as Record<string, unknown>;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

/** Business authorization and provisioning logic; adapters are server-side only. */
export function createUserService(deps: UserDependencies) {
  async function admin(uid: string | null) {
    if (!uid) throw new UserOperationError('unauthenticated', 'Sign in first');
    const profile = await deps.profiles.get(uid);
    if (!profile || profile.role !== 'admin' || (profile.isActive !== undefined && profile.isActive !== true)
      || typeof profile.businessId !== 'string' || !profile.businessId.trim()) {
      throw new UserOperationError('permission-denied', 'Business admin access is required');
    }
    return profile;
  }
  async function target(actor: UserProfile, uid: string) {
    const profile = await deps.profiles.get(text(uid, 'user ID', 128));
    if (!profile || profile.businessId !== actor.businessId) throw new UserOperationError('permission-denied', 'Employee is outside the business');
    return profile;
  }
  return {
    async create(actorUid: string | null, input: unknown): Promise<string> {
      const actor = await admin(actorUid);
      const data = record(input);
      if (data.expectedActorUid !== actor.uid || data.expectedBusinessId !== actor.businessId) {
        throw new UserOperationError('permission-denied', 'The request belongs to a different signed-in session');
      }
      const requestId = text(data.requestId, 'request ID', 80);
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) throw new UserOperationError('invalid-argument', 'Invalid request ID');
      const email = text(data.email, 'email', 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserOperationError('invalid-argument', 'Invalid email');
      if (typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 128) throw new UserOperationError('invalid-argument', 'Invalid password length');
      const password = data.password;
      const selectedRole = role(data.role);
      const profileData = {
        fullName: text(data.fullName, 'full name'), email, role: selectedRole,
        department: selectedRole === 'admin' ? 'bar' as const : department(data.department),
        businessId: actor.businessId,
        phoneNumber: data.phoneNumber === undefined || data.phoneNumber === '' ? '' : text(data.phoneNumber, 'phone number', 40),
        isActive: true, isOnShift: false,
      };
      // Passwords are never persisted in receipts, fingerprints or logs.
      const key = hash(JSON.stringify([actor.businessId, actor.uid, requestId]));
      const uid = `tossit-${key}`;
      return deps.profiles.withEmployeeLock(uid, async () => {
        const status = await deps.profiles.reserve(key, hash(JSON.stringify(profileData)), uid);
        if (status === 'complete') {
          const existingProfile = await deps.profiles.get(uid);
          if (!existingProfile || existingProfile.isActive === false || existingProfile.businessId !== actor.businessId) {
            throw new UserOperationError('failed-precondition', 'Employee is no longer active');
          }
          await deps.accounts.enable(uid);
          return uid;
        }
        let created = false;
        let profileWritten = false;
        try {
          const existing = await deps.accounts.get(uid);
          if (existing && existing.email?.toLowerCase() !== email) throw new UserOperationError('already-exists', 'Request account does not match');
          if (!existing) {
            await deps.accounts.create({ uid, email, password, displayName: profileData.fullName, disabled: true });
            created = true;
          }
          await deps.profiles.finish(key, { uid, ...profileData });
          profileWritten = true;
          await deps.accounts.enable(uid);
          return uid;
        } catch (error) {
          if (!profileWritten) {
            // The batch may have committed even if its acknowledgement was lost.
            // If this read also fails, leave the disabled account/lease recoverable.
            const persistedProfile = await deps.profiles.get(uid);
            if (!persistedProfile) {
              // A failed cleanup retains its lease/receipt for a later resume.
              if (created) await deps.accounts.remove(uid);
              await deps.profiles.release(key);
            }
          }
          throw error;
        }
      });
    },
    async update(actorUid: string | null, uid: string, input: unknown): Promise<void> {
      const actor = await admin(actorUid);
      const previous = await target(actor, uid);
      const data = record(input);
      const keys = Object.keys(data);
      if (!keys.length || keys.some(key => !['fullName', 'phoneNumber', 'role', 'department'].includes(key))) throw new UserOperationError('invalid-argument', 'Unsupported profile fields');
      if (uid === actor.uid && 'role' in data) throw new UserOperationError('failed-precondition', 'Cannot change your own role');
      const values: Partial<UserProfile> = {};
      if ('fullName' in data) values.fullName = text(data.fullName, 'full name');
      if ('phoneNumber' in data) values.phoneNumber = data.phoneNumber === '' ? '' : text(data.phoneNumber, 'phone number', 40);
      if ('role' in data) values.role = role(data.role);
      const nextRole = values.role ?? previous.role;
      if ('department' in data) values.department = department(data.department);
      if (nextRole === 'admin') values.department = 'bar';
      else department(values.department ?? previous.department);
      await deps.profiles.update(uid, values);
    },
    async deactivate(actorUid: string | null, uid: string): Promise<void> {
      const actor = await admin(actorUid);
      if (actor.uid === uid) throw new UserOperationError('failed-precondition', 'Cannot deactivate your own account');
      await target(actor, uid);
      await deps.profiles.withEmployeeLock(uid, async () => {
        // Revoke database access before disabling Auth; retries remain safe.
        await deps.profiles.update(uid, { isActive: false, isOnShift: false, shiftStartedAt: null });
        await deps.accounts.disable(uid);
        await deps.accounts.revoke(uid);
      });
    },
  };
}
