import { collection, addDoc, updateDoc, deleteDoc, doc, getDocFromServer, getDocsFromServer, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { CustomProductCategory } from '../types/Product';
import { InventoryError, invalid } from '../domain/errors';
import { assertCurrentActor, getCurrentActor } from './access';
export async function getBusinessCategories(businessId: string): Promise<CustomProductCategory[]> {
  const actor = await getCurrentActor();
  if (actor.businessId !== businessId) throw new InventoryError('permission-denied', 'Business changed');
  const snapshot = await getDocsFromServer(query(collection(db, 'productCategories'), where('businessId', '==', actor.businessId)));
  assertCurrentActor(actor);
  return snapshot.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id } as CustomProductCategory));
}
export async function addCustomCategory(category: Omit<CustomProductCategory, 'id' | 'createdAt'>): Promise<string> {
  const actor = await getCurrentActor();
  if (actor.role !== 'admin' || category.businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Only your business admin can manage categories');
  if (typeof category.name !== 'string' || !category.name.trim()) invalid('Category name is required');
  assertCurrentActor(actor);
  const ref = await addDoc(collection(db, 'productCategories'), { name: category.name.trim(), businessId: actor.businessId, createdBy: actor.uid, createdAt: serverTimestamp() });
  assertCurrentActor(actor); return ref.id;
}
async function categoryForAdmin(id: string) {
  const actor = await getCurrentActor();
  if (actor.role !== 'admin') throw new InventoryError('permission-denied', 'Only a business admin can manage categories');
  const ref = doc(db, 'productCategories', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Category not found');
  if (snapshot.data().businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Category belongs to another business');
  assertCurrentActor(actor); return { actor, ref };
}
export async function updateCustomCategory(categoryId: string, updates: Partial<CustomProductCategory>): Promise<void> {
  const { actor, ref } = await categoryForAdmin(categoryId);
  if (updates.businessId !== undefined && updates.businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Category business cannot change');
  if (typeof updates.name !== 'string' || !updates.name.trim()) invalid('Category name is required');
  assertCurrentActor(actor); await updateDoc(ref, { name: updates.name.trim(), updatedAt: serverTimestamp() }); assertCurrentActor(actor);
}
export async function deleteCustomCategory(categoryId: string): Promise<void> {
  const { actor, ref } = await categoryForAdmin(categoryId);
  assertCurrentActor(actor); await deleteDoc(ref); assertCurrentActor(actor);
}
