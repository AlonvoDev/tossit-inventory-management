import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Fridge } from '../types/Fridge';

/**
 * Fetch all fridges for a given business. Admins only.
 *
 * @param businessId The business identifier (taken from the current
 *                   user’s profile). Required for multi‑tenant
 *                   isolation.
 * @returns An array of Fridge objects (id included).
 */
export const getBusinessFridges = async (
  businessId: string
): Promise<Fridge[]> => {
  try {
    const fridgesQuery = query(
      collection(db, 'fridges'),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(fridgesQuery);
    const fridges: Fridge[] = [];
    snapshot.forEach((docSnap) => {
      fridges.push({ id: docSnap.id, ...(docSnap.data() as Fridge) });
    });
    return fridges;
  } catch (error) {
    console.error('Error fetching fridges:', error);
    throw error;
  }
};

/**
 * Add a new fridge (location) to the business. Admin only.
 *
 * @param fridge Partial fridge without id/createdAt. Must include
 *               name, department and businessId.
 * @returns The Firestore document ID for the new fridge.
 */
export const addFridge = async (
  fridge: Omit<Fridge, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    // Validate required fields
    if (!fridge.name || !fridge.name.trim()) {
      throw new Error('Fridge name is required');
    }
    if (!fridge.department || (fridge.department !== 'bar' && fridge.department !== 'kitchen')) {
      throw new Error('Department must be either "bar" or "kitchen"');
    }
    if (!fridge.businessId || !fridge.businessId.trim()) {
      throw new Error('Business ID is required');
    }
    const docRef = await addDoc(collection(db, 'fridges'), {
      ...fridge,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding fridge:', error);
    throw error;
  }
};

/**
 * Update an existing fridge. Only provided fields will be updated.
 *
 * @param id The Firestore document ID of the fridge to update.
 * @param data Partial fridge fields to update (name, department).
 */
export const updateFridge = async (
  id: string,
  data: Partial<Omit<Fridge, 'id' | 'businessId' | 'createdAt'>>
): Promise<void> => {
  try {
    if (data.name !== undefined && (!data.name.trim())) {
      throw new Error('Fridge name cannot be empty');
    }
    if (data.department !== undefined && (data.department !== 'bar' && data.department !== 'kitchen')) {
      throw new Error('Department must be either "bar" or "kitchen"');
    }
    const fridgeRef = doc(db, 'fridges', id);
    await updateDoc(fridgeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating fridge:', error);
    throw error;
  }
};

/**
 * Delete a fridge by its ID.
 *
 * @param id The Firestore document ID of the fridge to delete.
 */
export const deleteFridge = async (id: string): Promise<void> => {
  try {
    const fridgeRef = doc(db, 'fridges', id);
    await deleteDoc(fridgeRef);
  } catch (error) {
    console.error('Error deleting fridge:', error);
    throw error;
  }
};