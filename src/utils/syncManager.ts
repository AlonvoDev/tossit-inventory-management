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
  // DocumentData 
} from 'firebase/firestore';
import { db } from '../services/firebase';

// Types
interface PendingOperation {
  type: 'addItem' | 'updateItem' | 'deleteItem' | 'markItemThrown' | 
         'addProduct' | 'updateProduct' | 'deleteProduct';
  data: Record<string, unknown>;
  timestamp: number;
  id: string;
}

/**
 * Processes any pending operations stored in localStorage
 * when the device comes back online
 */
export const processPendingOperations = async (): Promise<void> => {
  try {
    const pendingOperationsJson = localStorage.getItem('pendingOperations');
    if (!pendingOperationsJson) return;
    
    const pendingOperations: PendingOperation[] = JSON.parse(pendingOperationsJson);
    if (pendingOperations.length === 0) return;
    
    console.log(`Processing ${pendingOperations.length} pending operations...`);
    
    // Sort operations by timestamp (oldest first)
    const sortedOperations = [...pendingOperations].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each operation
    const results = [];
    for (const operation of sortedOperations) {
      try {
        switch (operation.type) {
          case 'addItem': {
            // Filter out undefined values to prevent Firestore errors
            const cleanItemData = cleanOperationData(operation.data);
            await addDoc(collection(db, 'items'), cleanItemData);
            break;
          }
          case 'addProduct': {
            const cleanProductData = cleanOperationData(operation.data);
            await addDoc(collection(db, 'products'), cleanProductData);
            break;
          }
          case 'updateItem':
            // For operations that target a specific document, check if it's an offline ID
            if (operation.id.startsWith('offline-')) {
              console.log('Skipping update for offline item:', operation.id);
            } else {
              const itemRef = doc(db, 'items', operation.id);
              await updateDoc(itemRef, operation.data);
            }
            break;
          case 'updateProduct':
            // For operations that target a specific document, check if it's an offline ID
            if (operation.id.startsWith('offline-')) {
              console.log('Skipping update for offline product:', operation.id);
            } else {
              const productRef = doc(db, 'products', operation.id);
              await updateDoc(productRef, operation.data);
            }
            break;
          case 'deleteItem':
            if (operation.id.startsWith('offline-')) {
              console.log('Skipping delete for offline item:', operation.id);
            } else {
              const itemRef = doc(db, 'items', operation.id);
              await deleteDoc(itemRef);
            }
            break;
          case 'deleteProduct':
            if (operation.id.startsWith('offline-')) {
              console.log('Skipping delete for offline product:', operation.id);
            } else {
              const productRef = doc(db, 'products', operation.id);
              await deleteDoc(productRef);
            }
            break;
          case 'markItemThrown':
            if (operation.id.startsWith('offline-')) {
              console.log('Skipping markThrown for offline item:', operation.id);
            } else {
              const itemRef = doc(db, 'items', operation.id);
              await updateDoc(itemRef, { isThrown: true, thrownAwayAt: Timestamp.now() });
            }
            break;
          default:
            console.warn('Unknown operation type:', operation.type);
        }
        results.push({ success: true, operation });
      } catch (error) {
        console.error(`Error processing operation ${operation.type}:`, error);
        results.push({ success: false, operation, error });
      }
    }
    
    // Clear all successfully processed operations
    const failedOperations = results
      .filter(result => !result.success)
      .map(result => result.operation);
    
    if (failedOperations.length > 0) {
      localStorage.setItem('pendingOperations', JSON.stringify(failedOperations));
      console.log(`${failedOperations.length} operations failed and will be retried later.`);
    } else {
      localStorage.removeItem('pendingOperations');
      console.log('All pending operations completed successfully!');
    }
    
    // Refresh cached items and products
    await refreshCachedData();
    
    return;
  } catch (error) {
    console.error('Error processing pending operations:', error);
    throw error;
  }
};

/**
 * Refreshes cached items and products for offline use
 */
const refreshCachedData = async (): Promise<void> => {
  try {
    // Refresh cached items
    await refreshCachedItems();
    
    // Refresh cached products
    await refreshCachedProducts();
    
  } catch (error) {
    console.error('Error refreshing cached data:', error);
  }
};

/**
 * Refreshes cached items for offline use
 */
const refreshCachedItems = async (): Promise<void> => {
  try {
    // Get all stored businessIds from cached items
    const allCachedItems = localStorage.getItem('cachedItems_all');
    if (!allCachedItems) return;
    
    const items = JSON.parse(allCachedItems);
    const businessIds = [...new Set(items.map((item: Record<string, unknown>) => item.businessId as string))];
    
    for (const businessId of businessIds) {
      // Fetch items for this business
      const q = query(collection(db, 'items'), where('businessId', '==', businessId));
      const querySnapshot = await getDocs(q);
      
      const fetchedItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update cache
      localStorage.setItem('cachedItems_all', JSON.stringify(fetchedItems));
      
      // Update area-specific caches
      const barItems = fetchedItems.filter((item: Record<string, unknown>) => item.area === 'bar');
      const kitchenItems = fetchedItems.filter((item: Record<string, unknown>) => item.area === 'kitchen');
      
      localStorage.setItem('cachedItems_bar', JSON.stringify(barItems));
      localStorage.setItem('cachedItems_kitchen', JSON.stringify(kitchenItems));
    }
    
    console.log('Cached items refreshed successfully');
  } catch (error) {
    console.error('Error refreshing cached items:', error);
  }
};

/**
 * Refreshes cached products for offline use
 */
const refreshCachedProducts = async (): Promise<void> => {
  try {
    // Get all stored businessIds from cached products
    const cachedProductsKey = 'cachedProducts_admin';
    const cachedProductsJson = localStorage.getItem(cachedProductsKey);
    if (!cachedProductsJson) return;
    
    const products = JSON.parse(cachedProductsJson);
    const businessIds = [...new Set(products.map((product: Record<string, unknown>) => product.businessId as string))];
    
    for (const businessId of businessIds) {
      // Fetch products for this business
      const q = query(collection(db, 'products'), where('businessId', '==', businessId));
      const querySnapshot = await getDocs(q);
      
      const fetchedProducts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update cache
      localStorage.setItem(cachedProductsKey, JSON.stringify(fetchedProducts));
    }
    
    console.log('Cached products refreshed successfully');
  } catch (error) {
    console.error('Error refreshing cached products:', error);
  }
};

/**
 * Sets up a listener to automatically sync when online
 */
export const setupSyncManager = (): () => void => {
  const handleOnline = async () => {
    console.log('Network connection restored. Starting sync...');
    try {
      await processPendingOperations();
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during sync:', error);
    }
  };
  
  window.addEventListener('online', handleOnline);
  
  // Also check immediately if we're online and have pending operations
  if (navigator.onLine && localStorage.getItem('pendingOperations')) {
    setTimeout(handleOnline, 2000); // Small delay to ensure everything is loaded
  }
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}; 

// Clear old pending operations that might have undefined values
export const clearPendingOperations = () => {
  try {
    localStorage.removeItem('pendingOperations');
    console.log('Cleared old pending operations');
  } catch (error) {
    console.error('Error clearing pending operations:', error);
  }
};

// Clean operation data by removing undefined values
const cleanOperationData = (data: Record<string, unknown>) => {
  if (!data || typeof data !== 'object') return data;
  
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  
  return cleaned;
}; 