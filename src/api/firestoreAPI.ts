import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types/Product';

// Types
export interface Item {
  id?: string;
  productName: string;
  type: 'kg' | 'units';
  amount: number;
  openingTime: Timestamp;
  expiryTime: Timestamp;
  userId: string;
  businessId: string;
  area: string;
  /**
   * Optional fridge/location identifier. When set, the item belongs to
   * a specific fridge. This enables grouping inventory by fridge.
   */
  fridgeId?: string;
  isThrown: boolean; // Legacy field for backward compatibility
  
  // New discard tracking fields
  discarded: boolean;
  discardedAt?: Timestamp;
  discardedBy?: string; // User UID who marked it as discarded
  discardedByName?: string; // User display name for easier reading
  discardedQuantity?: number; // Actual quantity discarded
  discardReason?: 'expired' | 'damaged' | 'other'; // Reason for discard
  
  // Product finished tracking (used up completely)
  finished: boolean;
  finishedAt?: Timestamp;
  finishedBy?: string; // User UID who marked it as finished
  finishedByName?: string; // User display name for easier reading
  
  // Notification tracking
  reminderSent?: boolean;
  adminNotified?: boolean;
}

// Get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      throw new Error('User profile not found');
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Get business products
export const getBusinessProducts = async (businessId: string): Promise<Product[]> => {
  try {
    const productsQuery = query(
      collection(db, 'products'),
      where('businessId', '==', businessId)
    );
    
    const querySnapshot = await getDocs(productsQuery);
    const products: Product[] = [];
    
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    return products;
  } catch (error) {
    console.error('Error getting business products:', error);
    // Try to get from cache if available
    const cachedProducts = localStorage.getItem(`products_${businessId}`);
    if (cachedProducts) {
      return JSON.parse(cachedProducts);
    }
    throw error;
  }
};

// Original addItem function
export const addItemOriginal = async (item: Omit<Item, 'id'>): Promise<string> => {
  try {
    // Extra safety: ensure no undefined or null values
    const safeItem = Object.fromEntries(
      Object.entries(item).filter(([key, value]) => {
        if (value === undefined || value === null) {
          console.warn(`Filtering out ${key} with value:`, value);
          return false;
        }
        return true;
      })
    );
    
    console.log('Adding item to Firestore:', safeItem);
    const docRef = await addDoc(collection(db, 'items'), safeItem);
    console.log('Item added to Firestore with ID:', docRef.id);
    
    // Store successfully added item in local cache
    try {
      const cachedItems = localStorage.getItem(`cachedItems_${item.area}`) || '[]';
      const parsedItems = JSON.parse(cachedItems) as Item[];
      parsedItems.push({ ...safeItem, id: docRef.id } as Item);
      localStorage.setItem(`cachedItems_${item.area}`, JSON.stringify(parsedItems));
      localStorage.setItem(`cachedItems_all`, JSON.stringify(parsedItems));
    } catch (cacheError) {
      console.error('Error caching item:', cacheError);
    }
    
    return docRef.id;
  } catch (error) {
    // Handle network errors
    const isNetworkError = error instanceof Error && 
      (error.message.includes('network') || 
       error.message.includes('timeout') || 
       error.message.includes('offline') ||
       error.message.includes('unavailable'));
       
    // Special handling for permission errors
    if (error instanceof Error && error.message.includes('permission')) {
      console.error('Permission error adding item. Simulating success:', error);
      // For development, return a fake ID to simulate success
      const fakeId = 'fake-item-id-' + Date.now();
      
      try {
        // Cache the fake item locally
        const cachedItems = localStorage.getItem(`cachedItems_${item.area}`) || '[]';
        const parsedItems = JSON.parse(cachedItems) as Item[];
        parsedItems.push({ ...item, id: fakeId });
        localStorage.setItem(`cachedItems_${item.area}`, JSON.stringify(parsedItems));
        localStorage.setItem(`cachedItems_all`, JSON.stringify(parsedItems));
      } catch (cacheError) {
        console.error('Error caching fake item:', cacheError);
      }
      
      return fakeId;
    }
    
    // Handle network errors by storing the item in pending operations
    if (isNetworkError) {
      console.error('Network error adding item. Storing in pending operations:', error);
      const offlineId = 'offline-item-' + Date.now();
      
      try {
        // Store in pending operations queue
        const pendingOperations = localStorage.getItem('pendingOperations') || '[]';
        const parsedOperations = JSON.parse(pendingOperations);
        parsedOperations.push({
          type: 'addItem',
          data: item,
          timestamp: Date.now(),
          id: offlineId
        });
        localStorage.setItem('pendingOperations', JSON.stringify(parsedOperations));
        
        // Add to cached items for immediate display
        const cachedItems = localStorage.getItem(`cachedItems_${item.area}`) || '[]';
        const parsedItems = JSON.parse(cachedItems) as Item[];
        parsedItems.push({ ...item, id: offlineId });
        localStorage.setItem(`cachedItems_${item.area}`, JSON.stringify(parsedItems));
        localStorage.setItem(`cachedItems_all`, JSON.stringify(parsedItems));
      } catch (cacheError) {
        console.error('Error storing offline item:', cacheError);
      }
      
      return offlineId;
    }
    
    console.error('Error adding item: ', error);
    throw error;
  }
};

// Create a clean item object without undefined values
// Create a clean item object without undefined values
const createCleanItem = (
  productName: string,
  amount: number,
  area: string,
  businessId: string,
  userId: string,
  fridgeId?: string
) => {
  console.log('createCleanItem called with:', {
    productName,
    amount,
    area,
    businessId,
    userId,
    fridgeId
  });
  
  if (!productName || !area || !businessId || !userId || amount == null) {
    throw new Error('Missing required parameters for item creation');
  }
  
  const openingTime = Timestamp.now();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 3);
  const expiryTime = Timestamp.fromDate(expiryDate);
  
  // Only include fields that have actual values
  const item: Item = {
    productName: String(productName),
    type: 'units',
    amount: Number(amount),
    openingTime,
    expiryTime,
    userId: String(userId),
    businessId: String(businessId),
    area: String(area),
    isThrown: false,
    discarded: false,
    finished: false,
    reminderSent: false,
    adminNotified: false,
    // If a fridgeId is provided, include it in the item. This allows
    // grouping inventory by fridge in the dashboard.
    ...(fridgeId ? { fridgeId } : {}),
  };
  
  console.log('Created clean item object:', item);
  return item;
};

// New addItem overload that accepts individual parameters
/**
 * Add a new inventory item to Firestore. This helper accepts individual
 * parameters instead of a full item object so the UI can call it easily.
 *
 * @param productId The associated product ID (not stored on the item directly).
 * @param productName The human readable name of the product.
 * @param amount The quantity of the product being opened.
 * @param area The area/department (e.g. "בר" or "מטבח").
 * @param businessId The business identifier for multi‑tenant support.
 * @param userId The UID of the user opening the product.
 * @param fridgeId Optional fridge/location ID where this item is stored.
 */
export const addItem = async (
  productId: string,
  productName: string,
  amount: number,
  area: string,
  businessId: string,
  userId: string,
  fridgeId?: string
): Promise<string> => {
  console.log('addItem called with parameters:', {
    productId,
    productName,
    amount,
    area,
    businessId,
    userId,
    fridgeId
  });

  try {
    // Build a clean item object including the fridge ID if provided
    const newItem = createCleanItem(productName, amount, area, businessId, userId, fridgeId);
    console.log('Created clean item:', newItem);
    return addItemOriginal(newItem);
  } catch (error) {
    console.error('Error adding item with parameters:', error);

    // If offline, store the pending operation
    if (!navigator.onLine) {
      const pendingOperations = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
      pendingOperations.push({
        type: 'addItem',
        data: createCleanItem(productName, amount, area, businessId, userId, fridgeId),
        timestamp: Date.now()
      });
      localStorage.setItem('pendingOperations', JSON.stringify(pendingOperations));
      throw new Error('Item stored offline - will sync when online');
    }

    throw error;
  }
};

// Update an existing inventory item
export const updateItem = async (id: string, data: Partial<Item>): Promise<void> => {
  try {
    const itemRef = doc(db, 'items', id);
    await updateDoc(itemRef, data);
  } catch (error) {
    console.error('Error updating item: ', error);
    throw error;
  }
};

// Mark an item as thrown
export const markItemAsThrown = async (id: string): Promise<void> => {
  return updateItem(id, { isThrown: true });
};

// Mark an item as discarded
export const markItemAsDiscarded = async (
  itemId: string, 
  discardedBy: string, 
  discardedByName: string,
  discardedQuantity?: number,
  discardReason?: 'expired' | 'damaged' | 'other'
): Promise<void> => {
  try {
    const itemRef = doc(db, 'items', itemId);
    const updateData: { [key: string]: any } = {
      discarded: true,
      discardedAt: Timestamp.now(),
      discardedBy: discardedBy,
      discardedByName: discardedByName,
      isThrown: true // Update legacy field for backward compatibility
    };
    
    // Add quantity if provided
    if (discardedQuantity !== undefined && discardedQuantity > 0) {
      updateData.discardedQuantity = discardedQuantity;
    }
    
    // Add discard reason if provided
    if (discardReason) {
      updateData.discardReason = discardReason;
    }
    
    await updateDoc(itemRef, updateData);
    console.log('Item marked as discarded:', itemId, 'with quantity:', discardedQuantity, 'reason:', discardReason);
  } catch (error) {
    console.error('Error marking item as discarded:', error);
    throw error;
  }
};

// Mark an item as finished (used up completely)
export const markItemAsFinished = async (
  itemId: string, 
  finishedBy: string, 
  finishedByName: string
): Promise<void> => {
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      finished: true,
      finishedAt: Timestamp.now(),
      finishedBy: finishedBy,
      finishedByName: finishedByName,
    });
    console.log('Item marked as finished:', itemId);
  } catch (error) {
    console.error('Error marking item as finished:', error);
    throw error;
  }
};

// Delete an inventory item
export const deleteItem = async (id: string): Promise<void> => {
  try {
    const itemRef = doc(db, 'items', id);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting item: ', error);
    throw error;
  }
};

// Get all inventory items for a business
export const getBusinessItems = async (businessId: string): Promise<Item[]> => {
  try {
    console.log('Fetching business items for businessId:', businessId);
    const q = query(collection(db, 'items'), where('businessId', '==', businessId));
    const querySnapshot = await getDocs(q);
    console.log('Query executed, found', querySnapshot.size, 'documents');
    const items = processQuerySnapshot(querySnapshot);
    console.log('Processed items:', items.length);
    return items;
  } catch (error) {
    // Special handling for permission errors
    if (error instanceof Error && error.message.includes('permission')) {
      console.error('Permission error getting business items. Using empty items list:', error);
      // For items, return an empty array instead of fake data
      // This is better for items since they represent open inventory
      return [];
    }
    
    console.error('Error getting business items: ', error);
    throw error;
  }
};

// Get all inventory items for a specific area (bar/kitchen)
export const getAreaItems = async (businessId: string, area: string): Promise<Item[]> => {
  try {
    const q = query(
      collection(db, 'items'), 
      where('businessId', '==', businessId),
      where('area', '==', area)
    );
    const querySnapshot = await getDocs(q);
    return processQuerySnapshot(querySnapshot);
  } catch (error) {
    console.error('Error getting area items: ', error);
    throw error;
  }
};

// Get all expired items that are not thrown
export const getExpiredItems = async (businessId: string): Promise<Item[]> => {
  try {
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId),
      where('isThrown', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const items = processQuerySnapshot(querySnapshot);
    
    // Filter for expired items (we have to do this client-side since Firestore doesn't support inequality queries on multiple fields)
    const now = Timestamp.now();
    return items.filter(item => item.expiryTime.toMillis() < now.toMillis());
  } catch (error) {
    console.error('Error getting expired items: ', error);
    throw error;
  }
};

// Get discarded items for a business
export const getDiscardedItems = async (businessId: string): Promise<Item[]> => {
  try {
    console.log('Fetching discarded items for businessId:', businessId);
    
    // Get all items for the business and filter client-side to handle both discarded and isThrown
    // This is necessary because Firestore doesn't support OR queries on different fields easily
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('All items query executed, found', querySnapshot.size, 'documents');
    
    const allItems = processQuerySnapshot(querySnapshot);
    
    // Filter for discarded items (either discarded=true OR isThrown=true)
    const discardedItems = allItems.filter(item => item.discarded || item.isThrown);
    
    // Sort by discardedAt (most recent first), fallback to openingTime if no discardedAt
    discardedItems.sort((a, b) => {
      const timeA = a.discardedAt?.toMillis() || a.openingTime?.toMillis() || 0;
      const timeB = b.discardedAt?.toMillis() || b.openingTime?.toMillis() || 0;
      return timeB - timeA; // Descending order (newest first)
    });
    
    console.log('Processed discarded items:', discardedItems.length);
    console.log('Discarded items details:', discardedItems.map(item => ({ 
      id: item.id, 
      name: item.productName, 
      area: item.area, 
      discarded: item.discarded, 
      isThrown: item.isThrown,
      discardedAt: item.discardedAt,
      discardedBy: item.discardedByName 
    })));
    
    return discardedItems;
  } catch (error) {
    console.error('Error getting discarded items:', error);
    throw error;
  }
};

// Get finished items for a business
export const getFinishedItems = async (businessId: string): Promise<Item[]> => {
  try {
    console.log('Fetching finished items for businessId:', businessId);
    
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId),
      where('finished', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Finished items query executed, found', querySnapshot.size, 'documents');
    
    const finishedItems = processQuerySnapshot(querySnapshot);
    
    // Sort by finishedAt (most recent first)
    finishedItems.sort((a, b) => {
      const aTime = a.finishedAt || a.openingTime;
      const bTime = b.finishedAt || b.openingTime;
      return bTime.toMillis() - aTime.toMillis();
    });
    
    console.log('Final finished items:', finishedItems.length);
    return finishedItems;
  } catch (error) {
    console.error('Error getting finished items:', error);
    throw error;
  }
};

// Interface for discard report summary
export interface DiscardReportItem {
  productName: string;
  totalQuantity: number;
  discardCount: number;
  reasons: {
    expired: number;
    damaged: number;
    other: number;
  };
  averageQuantity: number;
  lastDiscarded?: Date;
  type: 'kg' | 'units';
}

// Get discarded items with optional date filtering
export const getDiscardedItemsWithDateFilter = async (
  businessId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<Item[]> => {
  try {
    console.log('Fetching discarded items for businessId:', businessId, 'from:', startDate, 'to:', endDate);
    
    // Get all items for the business
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('All items query executed, found', querySnapshot.size, 'documents');
    
    const allItems = processQuerySnapshot(querySnapshot);
    
    // Filter for discarded items (either discarded=true OR isThrown=true)
    let discardedItems = allItems.filter(item => item.discarded || item.isThrown);
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      discardedItems = discardedItems.filter(item => {
        const discardDate = item.discardedAt?.toDate() || item.openingTime?.toDate();
        if (!discardDate) return false;
        
        if (startDate && discardDate < startDate) return false;
        if (endDate && discardDate > endDate) return false;
        
        return true;
      });
    }
    
    // Sort by discardedAt (most recent first), fallback to openingTime if no discardedAt
    discardedItems.sort((a, b) => {
      const timeA = a.discardedAt?.toMillis() || a.openingTime?.toMillis() || 0;
      const timeB = b.discardedAt?.toMillis() || b.openingTime?.toMillis() || 0;
      return timeB - timeA; // Descending order (newest first)
    });
    
    console.log('Found', discardedItems.length, 'discarded items matching date filter');
    return discardedItems;
  } catch (error) {
    console.error('Error fetching discarded items with date filter:', error);
    throw error;
  }
};

// Get discard report summary by product
export const getDiscardReport = async (
  businessId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<DiscardReportItem[]> => {
  try {
    console.log('Fetching discard report for businessId:', businessId, 'from:', startDate, 'to:', endDate);
    
    // Get discarded items with date filtering
    const discardedItems = await getDiscardedItemsWithDateFilter(businessId, startDate, endDate);
    
    // Group by product name and calculate totals
    const reportMap = new Map<string, DiscardReportItem>();
    
    discardedItems.forEach(item => {
      const productName = item.productName;
      
      if (!reportMap.has(productName)) {
        reportMap.set(productName, {
          productName,
          totalQuantity: 0,
          discardCount: 0,
          reasons: {
            expired: 0,
            damaged: 0,
            other: 0
          },
          averageQuantity: 0,
          type: item.type
        });
      }
      
      const report = reportMap.get(productName)!;
      
      // Add quantity (use discardedQuantity if available, otherwise use full amount)
      const discardedQuantity = item.discardedQuantity || item.amount || 0;
      report.totalQuantity += discardedQuantity;
      report.discardCount += 1;
      
      // Count by reason
      const reason = item.discardReason || 'other';
      if (reason in report.reasons) {
        report.reasons[reason] += 1;
      } else {
        report.reasons.other += 1;
      }
      
      // Update last discarded date
      const discardDate = item.discardedAt?.toDate();
      if (discardDate && (!report.lastDiscarded || discardDate > report.lastDiscarded)) {
        report.lastDiscarded = discardDate;
      }
    });
    
    // Calculate averages and convert to array
    const reportItems = Array.from(reportMap.values()).map(item => ({
      ...item,
      averageQuantity: item.discardCount > 0 ? item.totalQuantity / item.discardCount : 0
    }));
    
    // Sort by total quantity descending
    reportItems.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    console.log('Generated discard report:', reportItems.length, 'products');
    return reportItems;
  } catch (error) {
    console.error('Error generating discard report:', error);
    throw error;
  }
};

// Get expired items that are not discarded (for notifications)
export const getExpiredNotDiscardedItems = async (businessId: string): Promise<Item[]> => {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId),
      where('discarded', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const items = processQuerySnapshot(querySnapshot);
    
    // Filter for expired items (client-side filtering for complex queries)
    return items.filter(item => 
      item.expiryTime.toMillis() < now.toMillis()
    );
  } catch (error) {
    console.error('Error getting expired not discarded items:', error);
    throw error;
  }
};

// Helper function to process Firestore query snapshots
const processQuerySnapshot = (querySnapshot: { size: number; forEach: (callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) => void }): Item[] => {
  const items: Item[] = [];
  console.log('processQuerySnapshot: processing', querySnapshot.size, 'documents');
  
  querySnapshot.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
    const data = doc.data();
    const item: Item = {
      id: doc.id,
      productName: (data.productName as string) || '',
      type: (data.type as 'kg' | 'units') || 'units',
      amount: (data.amount as number) || 0,
      openingTime: data.openingTime as Timestamp,
      expiryTime: data.expiryTime as Timestamp,
      userId: (data.userId as string) || '',
      businessId: (data.businessId as string) || '',
      area: (data.area as string) || '',
      isThrown: (data.isThrown as boolean) || false,
      
      // New discard tracking fields with safe defaults
      discarded: (data.discarded as boolean) || false,
      // Only include optional fields if they exist in the data
      discardedAt: data.discardedAt ? (data.discardedAt as Timestamp) : undefined,
      discardedBy: data.discardedBy ? (data.discardedBy as string) : undefined,
      discardedByName: data.discardedByName ? (data.discardedByName as string) : undefined,
      
      // Notification tracking with safe defaults
      reminderSent: (data.reminderSent as boolean) || false,
      adminNotified: (data.adminNotified as boolean) || false,
      finished: (data.finished as boolean) || false
    };

    // Include fridgeId if it exists on the document. This enables
    // grouping and filtering inventory by fridge.
    if (data.fridgeId) {
      item.fridgeId = data.fridgeId as string;
    }
    
    console.log('Processed item:', {
      id: item.id,
      productName: item.productName,
      area: item.area,
      isThrown: item.isThrown,
      discarded: item.discarded
    });
    
    items.push(item);
  });
  
  console.log('processQuerySnapshot: returning', items.length, 'items');
  return items;
}; 