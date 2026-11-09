import { collection, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, getDocsFromServer, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { Fridge } from '../types/Fridge';
import type { UserProfile } from '../types/UserProfile';
import { InventoryError, invalid } from '../domain/errors';
import { normalizeDepartment } from '../domain/normalizeItem';
import { assertCurrentActor, getCurrentActor, scopedBusinessQuery } from './access';
function manages(actor: UserProfile, fridge: Fridge) {
  if (!['admin', 'manager'].includes(actor.role) || fridge.businessId !== actor.businessId || !normalizeDepartment(fridge.department) || (actor.role !== 'admin' && normalizeDepartment(fridge.department) !== actor.department)) throw new InventoryError('permission-denied', 'Fridge is outside your management scope');
  if (typeof fridge.name !== 'string' || !fridge.name.trim()) invalid('Fridge name is required');
}
export async function getBusinessFridges(businessId: string): Promise<Fridge[]> {
  const uid = auth.currentUser?.uid;
  const snapshot = await getDocsFromServer(await scopedBusinessQuery('fridges', 'department', businessId));
  if (!uid || auth.currentUser?.uid !== uid) throw new InventoryError('unauthenticated', 'Account changed during fridge read');
  return snapshot.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id, department: normalizeDepartment(snapshot.data().department) } as Fridge));
}
export async function addFridge(fridge: Omit<Fridge, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const actor = await getCurrentActor(); manages(actor, fridge); assertCurrentActor(actor);
  const ref = await addDoc(collection(db, 'fridges'), { ...fridge, department: normalizeDepartment(fridge.department), createdAt: serverTimestamp() });
  assertCurrentActor(actor); return ref.id;
}
export async function updateFridge(id: string, data: Partial<Omit<Fridge, 'id' | 'businessId' | 'createdAt'>>): Promise<void> {
  const actor = await getCurrentActor(); const ref = doc(db, 'fridges', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Fridge not found');
  const before = snapshot.data() as Fridge;
  manages(actor, before); manages(actor, { ...before, ...data }); assertCurrentActor(actor);
  await updateDoc(ref, { ...data, ...(data.department !== undefined ? { department: normalizeDepartment(data.department) } : {}), updatedAt: serverTimestamp() });
  assertCurrentActor(actor);
}
export async function deleteFridge(id: string): Promise<void> {
  const actor = await getCurrentActor(); const ref = doc(db, 'fridges', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Fridge not found');
  manages(actor, snapshot.data() as Fridge); assertCurrentActor(actor);
  await deleteDoc(ref); assertCurrentActor(actor);
}
