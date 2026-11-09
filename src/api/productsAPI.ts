import { addDoc, collection, deleteDoc, doc, getDocFromServer, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Product } from '../types/Product';
import type { UserProfile } from '../types/UserProfile';
import { normalizeDepartment } from '../domain/normalizeItem';
import { InventoryError, invalid } from '../domain/errors';
import { assertCurrentActor, getCurrentActor, readScopedCollection } from './access';

function manages(actor: UserProfile, data: Pick<Product, 'businessId' | 'area'>) {
  if (!['admin', 'manager'].includes(actor.role) || actor.businessId !== data.businessId || !normalizeDepartment(data.area) || (actor.role !== 'admin' && actor.department !== normalizeDepartment(data.area))) throw new InventoryError('permission-denied', 'Product is outside your management scope');
}
function validate(product: Omit<Product, 'id' | 'createdAt'>) {
  if (typeof product.name !== 'string' || !product.name.trim() || !normalizeDepartment(product.area)
      || !['kg', 'units'].includes(product.type) || !Number.isInteger(product.shelfLifeDays) || product.shelfLifeDays < 1 || product.shelfLifeDays > 3650) invalid('Invalid product name, department, unit or shelf life');
}
async function validFridge(product: Omit<Product, 'id' | 'createdAt'>) {
  if (!product.fridgeId) return;
  const snapshot = await getDocFromServer(doc(db, 'fridges', product.fridgeId));
  if (!snapshot.exists() || snapshot.data().businessId !== product.businessId || normalizeDepartment(snapshot.data().department) !== normalizeDepartment(product.area)) invalid('Fridge must belong to the product business and department');
}
export async function getBusinessProducts(businessId: string): Promise<Product[]> {
  const { records } = await readScopedCollection('products', 'area', businessId);
  return records.map(record => ({ ...record, area: normalizeDepartment(record.area) } as unknown as Product));
}
export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
  const actor = await getCurrentActor();
  manages(actor, product); validate(product); await validFridge(product); assertCurrentActor(actor);
  const ref = await addDoc(collection(db, 'products'), { ...product, area: normalizeDepartment(product.area), createdAt: serverTimestamp() });
  assertCurrentActor(actor);
  return ref.id;
}
export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const actor = await getCurrentActor();
  const ref = doc(db, 'products', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Product not found');
  const before = snapshot.data() as Product;
  const merged = { ...before, ...data };
  manages(actor, before); manages(actor, merged); validate(merged);
  if (data.id !== undefined || (data.businessId !== undefined && data.businessId !== before.businessId) || (data.type !== undefined && data.type !== before.type)) invalid('Product identity and unit cannot change');
  await validFridge(merged); assertCurrentActor(actor);
  await updateDoc(ref, { ...data, ...(data.area !== undefined ? { area: normalizeDepartment(data.area) } : {}), updatedAt: serverTimestamp() });
  assertCurrentActor(actor);
}
export async function deleteProduct(id: string, businessId?: string): Promise<void> {
  const actor = await getCurrentActor();
  if (businessId !== undefined && businessId !== actor.businessId) throw new InventoryError('permission-denied', 'Business changed');
  const ref = doc(db, 'products', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new InventoryError('not-found', 'Product not found');
  manages(actor, snapshot.data() as Product); assertCurrentActor(actor);
  await deleteDoc(ref); assertCurrentActor(actor);
}
export async function addSampleProducts(businessId: string): Promise<void> {
  // Explicit caller action only; every failed creation propagates.
  for (const product of [
    { productId: 'P001', name: 'חלב', shelfLifeDays: 3, type: 'units' as const, area: 'bar' as const },
    { productId: 'P002', name: 'שמנת', shelfLifeDays: 5, type: 'units' as const, area: 'bar' as const },
    { productId: 'P003', name: 'רוטב עגבניות', shelfLifeDays: 7, type: 'kg' as const, area: 'kitchen' as const },
  ]) await addProduct({ ...product, businessId });
}
