import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 

  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types/Product';

// Get all products for a business
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
    
    // Cache the products for offline use
    try {
      localStorage.setItem(`products_${businessId}`, JSON.stringify(products));
      localStorage.setItem('cachedProducts_admin', JSON.stringify(products));
    } catch (error) {
      console.error('Error caching products:', error);
    }
    
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

// Add a new product
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // Validate required fields
    if (!product.name || !product.name.trim()) {
      throw new Error('Product name is required');
    }
    
    if (!product.businessId || !product.businessId.trim()) {
      throw new Error('Business ID is required');
    }
    
    if (typeof product.shelfLifeDays !== 'number' || product.shelfLifeDays < 1) {
      throw new Error('Shelf life must be a positive number');
    }
    
    // Validate department/area - REQUIRED
    if (!product.area || (product.area !== 'bar' && product.area !== 'kitchen')) {
      throw new Error('Department must be either "bar" or "kitchen"');
    }
    
    // Validate fridgeId if provided (optional)
    if (product.fridgeId && !product.fridgeId.trim()) {
      throw new Error('Fridge ID cannot be empty if provided');
    }
    
    // Validate category if provided (optional)
    if (product.category && !product.category.trim()) {
      throw new Error('Category cannot be empty if provided');
    }
    
    // Validate type
    if (!product.type || (product.type !== 'kg' && product.type !== 'units')) {
      throw new Error('Type must be either "kg" or "units"');
    }
    
    const productWithTimestamp = {
      ...product,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'products'), productWithTimestamp);
    
    // Add to local cache
    try {
      const cachedProducts = localStorage.getItem(`products_${product.businessId}`) || '[]';
      const products = JSON.parse(cachedProducts);
      products.push({ id: docRef.id, ...product, createdAt: new Date().toISOString() });
      localStorage.setItem(`products_${product.businessId}`, JSON.stringify(products));
      localStorage.setItem('cachedProducts_admin', JSON.stringify(products));
    } catch (error) {
      console.error('Error updating product cache:', error);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    
    // Handle offline mode
    if (!navigator.onLine) {
      const offlineId = `offline-${Date.now()}`;
      const productWithMetadata = {
        ...product,
        id: offlineId,
        createdAt: new Date().toISOString()
      };
      
      // Add to pending operations
      const pendingOps = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
      pendingOps.push({
        type: 'addProduct',
        data: product,
        timestamp: Date.now(),
        id: offlineId
      });
      localStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
      
      // Update local cache
      try {
        const cachedProducts = localStorage.getItem(`products_${product.businessId}`) || '[]';
        const products = JSON.parse(cachedProducts);
        products.push(productWithMetadata);
        localStorage.setItem(`products_${product.businessId}`, JSON.stringify(products));
        localStorage.setItem('cachedProducts_admin', JSON.stringify(products));
      } catch (cacheError) {
        console.error('Error updating offline product cache:', cacheError);
      }
      
      return offlineId;
    }
    
    throw error;
  }
};

// Update an existing product
export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  try {
    // Validate provided fields
    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      throw new Error('Product name cannot be empty');
    }
    
    if (data.shelfLifeDays !== undefined && (typeof data.shelfLifeDays !== 'number' || data.shelfLifeDays < 1)) {
      throw new Error('Shelf life must be a positive number');
    }
    
    // Validate department/area if provided - REQUIRED
    if (data.area !== undefined && (!data.area || (data.area !== 'bar' && data.area !== 'kitchen'))) {
      throw new Error('Department must be either "bar" or "kitchen"');
    }
    
    // Validate type if provided
    if (data.type !== undefined && (!data.type || (data.type !== 'kg' && data.type !== 'units'))) {
      throw new Error('Type must be either "kg" or "units"');
    }
    
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Update local cache
    try {
      const businessId = data.businessId;
      if (businessId) {
        const cachedProducts = localStorage.getItem(`products_${businessId}`) || '[]';
        const products = JSON.parse(cachedProducts);
        const updatedProducts = products.map((p: Product) => 
          p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        );
        localStorage.setItem(`products_${businessId}`, JSON.stringify(updatedProducts));
        localStorage.setItem('cachedProducts_admin', JSON.stringify(updatedProducts));
      }
    } catch (error) {
      console.error('Error updating product cache:', error);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle offline updates
    if (!navigator.onLine) {
      // Add to pending operations
      const pendingOps = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
      pendingOps.push({
        type: 'updateProduct',
        data: { id, ...data },
        timestamp: Date.now()
      });
      localStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
      
      // Update local cache for immediate feedback
      try {
        const businessId = data.businessId;
        if (businessId) {
          const cachedProducts = localStorage.getItem(`products_${businessId}`) || '[]';
          const products = JSON.parse(cachedProducts);
          const updatedProducts = products.map((p: Product) => 
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          );
          localStorage.setItem(`products_${businessId}`, JSON.stringify(updatedProducts));
          localStorage.setItem('cachedProducts_admin', JSON.stringify(updatedProducts));
        }
      } catch (cacheError) {
        console.error('Error updating offline product cache:', cacheError);
      }
      
      return; // Resolve without error in offline mode
    }
    
    throw error;
  }
};

// Delete a product
export const deleteProduct = async (id: string, businessId?: string): Promise<void> => {
  try {
    const productRef = doc(db, 'products', id);
    
    // If we don't have businessId, first get the product to find its businessId
    let actualBusinessId = businessId;
    if (!actualBusinessId) {
      try {
        // Get the product first to determine its businessId
        const productSnapshot = await getDoc(doc(db, 'products', id));
        if (productSnapshot.exists()) {
          actualBusinessId = productSnapshot.data()?.businessId;
        }
      } catch (err) {
        console.error('Error getting product for deletion:', err);
        // Continue with deletion even if we couldn't get the businessId
      }
    }
    
    await deleteDoc(productRef);
    
    // Update local cache if we have a businessId
    if (actualBusinessId) {
      try {
        const cachedProducts = localStorage.getItem(`products_${actualBusinessId}`) || '[]';
        const products = JSON.parse(cachedProducts);
        const filteredProducts = products.filter((p: Product) => p.id !== id);
        localStorage.setItem(`products_${actualBusinessId}`, JSON.stringify(filteredProducts));
        localStorage.setItem('cachedProducts_admin', JSON.stringify(filteredProducts));
      } catch (error) {
        console.error('Error updating product cache after deletion:', error);
      }
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    
    // Handle offline deletion
    if (!navigator.onLine) {
      // Add to pending operations
      const pendingOps = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
      pendingOps.push({
        type: 'deleteProduct',
        data: { id, businessId },
        timestamp: Date.now()
      });
      localStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
      
      // Update local cache if businessId is available
      if (businessId) {
        try {
          const cachedProducts = localStorage.getItem(`products_${businessId}`) || '[]';
          const products = JSON.parse(cachedProducts);
          const filteredProducts = products.filter((p: Product) => p.id !== id);
          localStorage.setItem(`products_${businessId}`, JSON.stringify(filteredProducts));
          localStorage.setItem('cachedProducts_admin', JSON.stringify(filteredProducts));
        } catch (cacheError) {
          console.error('Error updating offline product cache after deletion:', cacheError);
        }
      }
      
      return; // Resolve without error in offline mode
    }
    
    throw error;
  }
};

// Add sample products (for new businesses or development)
export const addSampleProducts = async (businessId: string): Promise<void> => {
  const sampleProducts = [
    {
      productId: 'P001',
      name: 'חלב',
      shelfLifeDays: 3,
      type: 'units',
      area: 'bar',
      businessId
    },
    {
      productId: 'P002',
      name: 'שמנת',
      shelfLifeDays: 5,
      type: 'units',
      area: 'bar',
      businessId
    },
    {
      productId: 'P003',
      name: 'רוטב עגבניות',
      shelfLifeDays: 7,
      type: 'kg',
      area: 'kitchen',
      businessId
    }
  ];
  
  for (const product of sampleProducts) {
    try {
      await addProduct({
        ...product,
        area: product.area as 'bar' | 'kitchen' | '',
        type: product.type as 'kg' | 'units'
      });
    } catch (error) {
      console.error(`Error adding sample product ${product.name}:`, error);
    }
  }
};
