import { collection, doc, getDocFromServer, getDocsFromServer, query, where } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { InventoryError } from '../domain/errors';
import { parseUserProfile } from '../domain/userProfile';
import { departmentValues, normalizeDepartment } from '../domain/normalizeItem';
import { offlineStore, readRememberedProfile, rememberProfile } from '../offline/storage';
import type { UserProfile } from '../types/UserProfile';

export function assertCurrentActor(actor: UserProfile): void {
  if (auth.currentUser?.uid !== actor.uid) throw new InventoryError('unauthenticated', 'The active account changed; retry with the current session');
}
export async function getCurrentActor(): Promise<UserProfile> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new InventoryError('unauthenticated', 'Sign in first');
  const snapshot = await getDocFromServer(doc(db, 'users', uid));
  if (auth.currentUser?.uid !== uid) throw new InventoryError('unauthenticated', 'The active account changed');
  const actor = snapshot.exists() ? parseUserProfile(uid, snapshot.data()) : null;
  if (!actor) {
    await offlineStore.removeProfile(uid).catch(() => undefined);
    throw new InventoryError('permission-denied', 'An active business profile is required');
  }
  await rememberProfile(actor).catch(() => undefined); // Online authority does not depend on cache availability.
  assertCurrentActor(actor);
  return actor;
}
export const isInventoryOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
export function isUnavailable(error: unknown): boolean { return !!error && typeof error === 'object' && 'code' in error && ['unavailable', 'deadline-exceeded'].includes(String(error.code).split('/').pop()!); }
export async function getInventoryActor(): Promise<UserProfile> {
  if (isInventoryOnline()) {
    try { return await getCurrentActor(); } catch (error) { if (!isUnavailable(error)) throw error; }
  }
  const uid = auth.currentUser?.uid;
  if (!uid) throw new InventoryError('unauthenticated', 'Sign in first');
  const actor = await readRememberedProfile(uid);
  if (!actor) throw new InventoryError('unavailable', 'No verified profile is available offline');
  assertCurrentActor(actor); return actor;
}
/** Cache is only used for explicit offline/unavailable conditions, never permission denials. */
export async function readScopedCollection(name: 'products' | 'fridges' | 'items', field: 'area' | 'department', businessId: string): Promise<{ actor: UserProfile; records: Record<string, unknown>[] }> {
  const actor = await getInventoryActor();
  if (businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Business changed');
  let records: Record<string, unknown>[] | undefined;
  if (isInventoryOnline()) {
    try {
      const snapshot = await getDocsFromServer(query(collection(db, name), where('businessId', '==', actor.businessId), ...(actor.role === 'admin' ? [] : [where(field, 'in', departmentValues(actor.department))])));
      assertCurrentActor(actor);
      records = snapshot.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id }));
      await offlineStore.putCache(actor, name, records).catch(() => undefined);
    } catch (error) { if (!isUnavailable(error)) throw error; }
  }
  if (!records) records = await offlineStore.getCache<Record<string, unknown>[]>(actor, name);
  assertCurrentActor(actor);
  if (!Array.isArray(records)) throw new InventoryError('unavailable', 'No account-scoped offline data is available');
  return { actor, records: records.filter(record => record.businessId === actor.businessId && (actor.role === 'admin' || normalizeDepartment(record[field]) === actor.department)) };
}
/** Build server-side business/department constraints. Rules still enforce every request. */
export async function scopedBusinessQuery(name: 'products' | 'fridges' | 'items', departmentField: 'area' | 'department', businessId?: string) {
  const actor = await getInventoryActor();
  if (businessId !== undefined && actor.businessId !== businessId) throw new InventoryError('permission-denied', 'Business does not match the active session');
  return query(collection(db, name), where('businessId', '==', actor.businessId),
    ...(actor.role === 'admin' ? [] : [where(departmentField, 'in', departmentValues(actor.department))]));
}
