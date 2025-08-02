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
import { CustomProductCategory } from '../types/Product';

/**
 * Fetch all custom categories for a given business
 */
export const getBusinessCategories = async (
  businessId: string
): Promise<CustomProductCategory[]> => {
  try {
    const categoriesQuery = query(
      collection(db, 'productCategories'),
      where('businessId', '==', businessId)
    );
    const snapshot = await getDocs(categoriesQuery);
    const categories: CustomProductCategory[] = [];
    snapshot.forEach((docSnap) => {
      const categoryData = docSnap.data() as Omit<CustomProductCategory, 'id'>;
      categories.push({ id: docSnap.id, ...categoryData });
    });
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Add a new custom category
 */
export const addCustomCategory = async (
  category: Omit<CustomProductCategory, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    // Validate required fields
    if (!category.name || !category.name.trim()) {
      throw new Error('Category name is required');
    }
    
    if (!category.businessId || !category.businessId.trim()) {
      throw new Error('Business ID is required');
    }
    
    const categoryWithTimestamp = {
      ...category,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'productCategories'), categoryWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

/**
 * Update an existing custom category
 */
export const updateCustomCategory = async (
  categoryId: string,
  updates: Partial<CustomProductCategory>
): Promise<void> => {
  try {
    const categoryRef = doc(db, 'productCategories', categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a custom category
 */
export const deleteCustomCategory = async (categoryId: string): Promise<void> => {
  try {
    const categoryRef = doc(db, 'productCategories', categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};