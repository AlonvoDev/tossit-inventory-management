import { collection, doc, getDocFromServer, query, where } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { InventoryError } from '../domain/errors';
import { parseUserProfile } from '../domain/userProfile';
import { departmentValues } from '../domain/normalizeItem';
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
  if (!actor) throw new InventoryError('permission-denied', 'An active business profile is required');
  return actor;
}
/** Build server-side business/department constraints. Rules still enforce every request. */
export async function scopedBusinessQuery(name: 'products' | 'fridges' | 'items', departmentField: 'area' | 'department', businessId?: string) {
  const actor = await getCurrentActor();
  if (businessId !== undefined && actor.businessId !== businessId) throw new InventoryError('permission-denied', 'Business does not match the active session');
  return query(collection(db, name), where('businessId', '==', actor.businessId),
    ...(actor.role === 'admin' ? [] : [where(departmentField, 'in', departmentValues(actor.department))]));
}
