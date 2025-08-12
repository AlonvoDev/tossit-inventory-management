import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBusinessProducts,
  addProduct,
  updateProduct,
  deleteProduct
} from '../api/productsAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { getBusinessCategories, addCustomCategory } from '../api/categoriesAPI';
import { Product, PRODUCT_CATEGORIES } from '../types/Product';
import { Fridge } from '../types/Fridge';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
// import { useNavigate } from 'react-router-dom';
import { 
    // FormControl,
  // InputLabel,
  // Select,
  // MenuItem,
  Alert,
  // Box
} from '@mui/material';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';

interface ProductManagementProps {
  isOffline?: boolean;
}

const ProductManagement: React.FC<ProductManagementProps> = () => {
  const { businessId, profile, isAdmin, isManager, isOffline, loading: authLoading } = useAuth();
  // Use the passed prop or fall back to auth context - remove unused variable warning
  // const effectiveIsOffline = propIsOffline ?? isOffline;
  const [products, setProducts] = useState<Product[]>([]);
  // const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Validation states
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [shelfLifeError, setShelfLifeError] = useState<string | null>(null);
  
  // New states for refrigerators and categories
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Get user's department for filtering and default values
  const userDepartment = profile?.department;
  const canManageAllDepartments = isAdmin || isManager;

  // Clear validation errors when user starts typing
  const clearNameError = () => setNameError(null);
  const clearShelfLifeError = () => setShelfLifeError(null);
  const clearDepartmentError = () => setDepartmentError(null);
  
  // Load fridges and categories
  useEffect(() => {
    const loadFridgesAndCategories = async () => {
      if (!businessId) return;
      
      try {
        // Load fridges
        const fridgesData = await getBusinessFridges(businessId);
        setFridges(fridgesData);
        
        // Load custom categories
        const customCategoriesData = await getBusinessCategories(businessId);
        
        // Combine predefined and custom categories
        const combinedCategories = [
          ...PRODUCT_CATEGORIES,
          ...customCategoriesData.map(cat => cat.name)
        ];
        setAllCategories(combinedCategories);
      } catch (error) {
        console.error('Error loading fridges and categories:', error);
      }
    };
    
    loadFridgesAndCategories();
  }, [businessId]);
  
  // Add new custom category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !businessId) return;
    
    try {
      await addCustomCategory({
        name: newCategoryName.trim(),
        businessId,
        createdBy: profile?.email
      });
      
      // Refresh categories
      const customCategoriesData = await getBusinessCategories(businessId);
      
      const combinedCategories = [
        ...PRODUCT_CATEGORIES,
        ...customCategoriesData.map(cat => cat.name)
      ];
      setAllCategories(combinedCategories);
      
      setNewCategoryName('');
      setShowAddCategoryForm(false);
      setSuccess(`קטגוריה "${newCategoryName.trim()}" נוספה בהצלחה!`);
    } catch (error) {
      console.error('Error adding category:', error);
      setError('שגיאה בהוספת הקטגוריה');
    }
  };

  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'createdAt'>>({
    productId: '',
    name: '',
    shelfLifeDays: 1,
    type: 'units',
    area: userDepartment || 'bar', // Use user's department as default
    businessId: businessId || '',
    category: '',
    fridgeId: '',
  });
  // const [newBusinessId, setNewBusinessId] = useState<string>('');
  // const [isSettingBusinessId, setIsSettingBusinessId] = useState<boolean>(false);
  const [tempBusinessId, setTempBusinessId] = useState<string>('business1');
  const [useCachedProducts, setUseCachedProducts] = useState(false);

  // Use uncontrolled inputs for better editing
  // const nameInputRef = useRef<HTMLInputElement>(null);
  // const expiryInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const editExpiryInputRef = useRef<HTMLInputElement>(null);

  // Generate next product ID based on existing products
  const generateNextProductId = () => {
    if (products.length === 0) return 'P001';

    // Extract numeric part of product IDs and find the highest
    const numericIds = products
      .map(p => {
        const match = p.productId.match(/P(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(id => !isNaN(id));

    if (numericIds.length === 0) return 'P001';
    
    const highestId = Math.max(...numericIds);
    const nextId = highestId + 1;
    return `P${nextId.toString().padStart(3, '0')}`;
  };

  // Load products from API or cache
  useEffect(() => {
    const loadProducts = async () => {
      if (!businessId) return;
      
      setLoading(true);
      setError(null);
      
      // Check offline mode and cached data
      const cacheKey = canManageAllDepartments ? 'cachedProducts_admin' : (userDepartment ? `cachedProducts_${userDepartment}` : 'cachedProducts_admin');
      const cachedProductsJson = localStorage.getItem(cacheKey);
      
      // If we're offline and have cached products, use them
      if (isOffline && cachedProductsJson) {
        try {
          const cachedProducts = JSON.parse(cachedProductsJson);
          setProducts(cachedProducts);
          setUseCachedProducts(true);
          console.log(`Using cached products for ${userDepartment || 'all departments'} in offline mode`);
          setLoading(false);
          
          // Set the next product ID based on cached products
          if (cachedProducts.length > 0) {
            const maxProductId = Math.max(...cachedProducts.map((p: Product) => 
              parseInt(p.productId.replace(/\D/g, '')) || 0
            ));
            setNewProduct(prev => ({ ...prev, productId: `product${maxProductId + 1}` }));
          } else {
            setNewProduct(prev => ({ ...prev, productId: 'product1' }));
          }
          return;
        } catch (e) {
          console.error('Error parsing cached products:', e);
          // Continue to try fetching from API
        }
      }
      
      try {
        const fetchedProducts = await getBusinessProducts(businessId);
        // Store all products for admin use
        setProducts(fetchedProducts); // Store all products
        
        // Filter products based on user's department (unless user is admin or manager)
        let filteredProducts = fetchedProducts;
        if (userDepartment && !canManageAllDepartments) {
          filteredProducts = fetchedProducts.filter(product => product.area === userDepartment);
        }
        
        setProducts(filteredProducts);
        setUseCachedProducts(false);
        
        // Set the next product ID based on all products (not just filtered)
        if (fetchedProducts.length > 0) {
          const maxProductId = Math.max(...fetchedProducts.map(p => 
            parseInt(p.productId.replace(/\D/g, '')) || 0
          ));
          setNewProduct(prev => ({ ...prev, productId: `product${maxProductId + 1}` }));
        } else {
          setNewProduct(prev => ({ ...prev, productId: 'product1' }));
        }
        
        // Cache filtered products for offline use
        localStorage.setItem(cacheKey, JSON.stringify(filteredProducts));
      } catch (error) {
        console.error('Error loading products:', error);
        setError('טעינת המוצרים נכשלה. בדוק הרשאות או נסה שוב מאוחר יותר.');
        
        // Try to use cached products as fallback
        if (cachedProductsJson) {
          try {
            const cachedProducts = JSON.parse(cachedProductsJson);
            setProducts(cachedProducts);
            setUseCachedProducts(true);
            setError('טעינת המוצרים מהשרת נכשלה. מוצג מידע מהמטמון המקומי.');
            
            // Set the next product ID based on cached products
            if (cachedProducts.length > 0) {
              const maxProductId = Math.max(...cachedProducts.map((p: Product) => 
                parseInt(p.productId.replace(/\D/g, '')) || 0
              ));
              setNewProduct(prev => ({ ...prev, productId: `product${maxProductId + 1}` }));
            }
          } catch (e) {
            console.error('Error parsing cached products:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Only load products if auth is loaded and we have user info
    if (!authLoading && profile) {
      loadProducts();
    }
  }, [businessId, isOffline, userDepartment, isAdmin, authLoading, profile, canManageAllDepartments]);

  // Update newProduct area when user department changes
  useEffect(() => {
    if (userDepartment) {
      setNewProduct(prev => ({ ...prev, area: userDepartment }));
    }
  }, [userDepartment]);

  // Set auto-generated product ID when adding a new product
  useEffect(() => {
    if (!editMode) {
      setNewProduct(prev => ({
        ...prev,
        productId: generateNextProductId()
      }));
    }
  }, [products, editMode, generateNextProductId]);

  // Clear/reset any issues
  const resetForm = () => {
    const form = document.getElementById('productForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
  };

  // Modified form submit handler with offline support
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Clear previous validation errors
    setDepartmentError(null);
    setNameError(null);
    setShelfLifeError(null);
    
    // Check if we're in edit mode, call update instead
    if (editMode && selectedProduct) {
      await handleUpdateProduct(event);
      return;
    }
    
    // Extract form data from the actual form
    const form = event.target as HTMLFormElement;
    const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
    const shelfLifeDaysInput = form.querySelector('input[name="shelfLifeDays"]') as HTMLInputElement;
    const typeSelect = form.querySelector('select[name="type"]') as HTMLSelectElement;
    const departmentSelect = form.querySelector('select[name="department"]') as HTMLSelectElement;
    
    if (!nameInput || !shelfLifeDaysInput || !typeSelect || !departmentSelect) {
      console.error("Form inputs not found");
      setError('שגיאה בטופס, נסה שוב');
      return;
    }
    
    const name = nameInput.value.trim();
    const shelfLifeDays = parseInt(shelfLifeDaysInput.value);
    const type = typeSelect.value as 'kg' | 'units';
    const department = departmentSelect.value as 'bar' | 'kitchen' | '';
    
    // Get new fields
    const categorySelect = form.querySelector('select[name="category"]') as HTMLSelectElement;
    const fridgeSelect = form.querySelector('select[name="fridgeId"]') as HTMLSelectElement;
    const category = categorySelect?.value || '';
    const fridgeId = fridgeSelect?.value || '';
    
    // Validation
    let hasErrors = false;
    
    if (!name) {
      setNameError('יש להזין שם מוצר');
      hasErrors = true;
    }
    
    if (isNaN(shelfLifeDays) || shelfLifeDays < 1) {
      setShelfLifeError('יש להזין מספר ימי תוקף תקין');
      hasErrors = true;
    }
    
    // Department validation - REQUIRED
    if (!department || (department !== 'bar' && department !== 'kitchen')) {
      setDepartmentError('יש לבחור מחלקה');
      hasErrors = true;
    }
    
    // Stop submission if there are validation errors
    if (hasErrors) {
      setError('יש לתקן את השגיאות בטופס');
      return;
    }
    
    if (!businessId) {
      setError('לא נמצא מזהה עסק');
      return;
    }
    
    const productToAdd = {
      productId: newProduct.productId,
      name,
      shelfLifeDays,
      type,
      area: department, // Use validated department
      businessId,
      category: category || undefined,
      fridgeId: fridgeId || undefined,
    };
    
    try {
      setLoading(true);
      
      if (isOffline) {
        // Handle offline mode: store in cache
        const cachedProductsKey = 'cachedProducts_admin';
        const cachedProductsJson = localStorage.getItem(cachedProductsKey) || '[]';
        const cachedProducts = JSON.parse(cachedProductsJson);
        
        // Create a fake ID
        const newId = 'offline-product-' + Date.now();
        const offlineProduct = {
          ...productToAdd,
          id: newId,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        };
        
        cachedProducts.push(offlineProduct);
        localStorage.setItem(cachedProductsKey, JSON.stringify(cachedProducts));
        
        // Update local state
        setProducts([...products, offlineProduct as any]);
        setSuccess(`המוצר "${name}" נוסף במצב לא מקוון (יסונכרן כשהחיבור יחזור)`);
        
        // Add to pending operations queue
        const pendingOps = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
        pendingOps.push({
          type: 'addProduct',
          data: productToAdd,
          timestamp: Date.now(),
          id: newId
        });
        localStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
      } else {
        // Online mode: add to Firestore
        const id = await addProduct(productToAdd);
        setProducts([...products, { ...productToAdd, id }]);
        setSuccess(`המוצר "${name}" נוסף בהצלחה!`);
      }
      
      // Reset form
      form.reset();
      
      // Set next product ID and hide the form
      const currentIdNum = parseInt(newProduct.productId.replace(/\D/g, '')) || 0;
      setNewProduct(prev => ({
        ...prev,
        productId: `P${(currentIdNum + 1).toString().padStart(3, '0')}`,
        name: '',
        shelfLifeDays: 1,
        type: 'units',
        area: 'bar'
      }));
      
      // Hide the form after successful submission
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding product:', error);
      setError('הוספת המוצר נכשלה. בדוק הרשאות או נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  // Handle updating a product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !selectedProduct.id) {
      setError('לא נבחר מוצר');
      return;
    }

    // Get values directly from refs
    const nameValue = editNameInputRef.current?.value || '';
    const shelfLifeDaysValue = editExpiryInputRef.current?.value || '1';
    const areaValue = selectedProduct.area;
    const typeValue = selectedProduct.type;

    if (!nameValue) {
      setError('נא להזין שם מוצר');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateProduct(selectedProduct.id, {
        name: nameValue,
        shelfLifeDays: parseInt(shelfLifeDaysValue),
        area: areaValue,
        type: typeValue,
      });
      
      setSuccess(`המוצר "${nameValue}" עודכן בהצלחה!`);
      
      // Reload products and reset form
      const updatedProducts = await getBusinessProducts(businessId!);
      setProducts(updatedProducts);
      setSelectedProduct(null);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('עדכון המוצר נכשל. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מוצר זה?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await deleteProduct(id);
      
      setSuccess('המוצר נמחק בהצלחה!');
      
      // Reload products
      const updatedProducts = await getBusinessProducts(businessId!);
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('מחיקת המוצר נכשלה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  // Direct DOM approach to set business ID
  const handleSetBusinessIdDirectly = async () => {
    if (!auth.currentUser) {
      alert('נא להתחבר למערכת');
      return;
    }
    
    console.log('Setting business ID:', tempBusinessId);
    
    try {
      // Update the user document with the new business ID
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        businessId: tempBusinessId
      }, { merge: true });
      
      alert('מזהה עסק הוגדר בהצלחה! מרענן את הדף...');
      
      // Reload the page to refresh auth context
      window.location.reload();
    } catch (err) {
      console.error('Error setting business ID:', err);
      alert('שגיאה בהגדרת מזהה העסק: ' + (err as Error).message);
    }
  };

  // Get current user from auth
  // const currentUser = auth.currentUser;

  return (
    <div className="product-management" dir="rtl">
      <h2>ניהול מוצרים</h2>
      
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
      
      {isOffline && (
        <Alert 
          severity="warning" 
          icon={<WifiOffIcon />}
          sx={{ mb: 2 }}
        >
          מצב לא מקוון - מוצרים יישמרו באופן מקומי ויסונכרנו כשהחיבור יתחדש
        </Alert>
      )}
      
      {useCachedProducts && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          מציג מוצרים מהמטמון המקומי. ייתכן שהנתונים אינם מעודכנים.
        </Alert>
      )}
      
      {/* Debug info */}
      <div style={{ 
        background: '#f0f0f0', 
        padding: '10px', 
        border: '1px solid #ccc',
        marginBottom: '15px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: '#333'
      }}>
        <p>מזהה עסק: {businessId || 'חסר!'}</p>
        <p>מספר מוצרים: {products.length}</p>
        <p>מזהה מוצר הבא: {newProduct.productId}</p>
        <p>סטטוס טעינה: {loading ? 'טוען...' : 'מוכן'}</p>
        <p>משתמש מחובר: {auth.currentUser?.email || 'לא מחובר'}</p>
        <p>מצב מקוון: {isOffline ? 'לא מקוון' : 'מקוון'}</p>
      </div>
      
      {/* Simple Business ID setup */}
      {!businessId && (
        <div style={{
          background: '#fffbe6',
          border: '2px solid #ffc107',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#d97706', marginTop: 0 }}>הגדרת מזהה עסק</h3>
          <p>לא נמצא מזהה עסק למשתמש שלך. יש להגדיר מזהה עסק כדי להשתמש במערכת.</p>
          
          <div style={{ display: 'flex', marginBottom: '10px' }}>
            <input
              type="text"
              value={tempBusinessId}
              onChange={(e) => setTempBusinessId(e.target.value)}
              placeholder="הזן מזהה עסק"
              style={{
                padding: '10px',
                fontSize: '16px',
                border: '2px solid #333',
                borderRadius: '4px',
                flex: '1',
                marginRight: '10px',
                direction: 'rtl'
              }}
            />
            <button
              onClick={handleSetBusinessIdDirectly}
              style={{
                padding: '10px 20px',
                background: '#228B22',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              הגדר
            </button>
          </div>
          
          <div style={{ fontSize: '14px', color: '#666' }}>
            * מזהה העסק משמש לארגון המוצרים והפריטים במערכת.
          </div>
        </div>
      )}
      
      {/* Only show product management when business ID exists */}
      {businessId && (
        <>
          {/* Single Add Product button */}
          {!editMode && !showAddForm && (
            <div className="product-actions">
              <button
                className="action-button"
                onClick={() => {
                  setSelectedProduct(null);
                  setEditMode(false);
                  setShowAddForm(true);
                  setSuccess(null);
                  setError(null);
                  
                  // Reset form
                  resetForm();
                  
                  // Set focus to name field
                  setTimeout(() => {
                    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
                    if (nameInput) {
                      nameInput.focus();
                    }
                  }, 100);
                }}
                style={{
                  background: '#2196F3',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  marginBottom: '20px'
                }}
              >
                הוסף מוצר חדש
              </button>
            </div>
          )}
          
          {/* Add/Edit Form - shown conditionally */}
          {showAddForm && !editMode && (
            <div className="add-product-form">
              <h3>הוספת מוצר חדש</h3>
              
              {/* Simple native form with minimal styling */}
              <form id="productForm" onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    מזהה מוצר:
                    <input 
                      type="text" 
                      value={newProduct.productId} 
                      readOnly 
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        background: '#f0f0f0',
                        color: '#000000',
                        fontWeight: 'bold',
                        border: '1px solid #888888'
                      }} 
                    />
                  </label>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    שם מוצר: <span style={{ color: 'red' }}>*</span>
                    <input 
                      type="text" 
                      name="name"
                      placeholder="הזן שם מוצר" 
                      required
                      onInput={clearNameError}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: nameError ? '2px solid #f44336' : '2px solid #333333',
                        color: '#000000',
                        fontWeight: 'bold'
                      }} 
                    />
                    {nameError && (
                      <div style={{ 
                        color: '#f44336', 
                        fontSize: '14px', 
                        marginTop: '5px',
                        fontWeight: 'normal'
                      }}>
                        {nameError}
                      </div>
                    )}
                  </label>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    תוקף בימים: <span style={{ color: 'red' }}>*</span>
                    <input 
                      type="number" 
                      name="shelfLifeDays"
                      min="1"
                      defaultValue="1"
                      required
                      onInput={clearShelfLifeError}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: shelfLifeError ? '2px solid #f44336' : '2px solid #333333',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff'
                      }} 
                    />
                    {shelfLifeError && (
                      <div style={{ 
                        color: '#f44336', 
                        fontSize: '14px', 
                        marginTop: '5px',
                        fontWeight: 'normal'
                      }}>
                        {shelfLifeError}
                      </div>
                    )}
                  </label>
                </div>
                
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    מחלקה: <span style={{ color: 'red' }}>*</span>
                    <select
                      name="department"
                      required
                      onChange={clearDepartmentError}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        marginTop: '5px',
                        border: departmentError ? '2px solid #f44336' : '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        backgroundColor: '#fff'
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>בחר מחלקה</option>
                      <option value="bar">בר</option>
                      <option value="kitchen">מטבח</option>
                    </select>
                    {departmentError && (
                      <div style={{ 
                        color: '#f44336', 
                        fontSize: '14px', 
                        marginTop: '5px',
                        fontWeight: 'normal'
                      }}>
                        {departmentError}
                      </div>
                    )}
                  </label>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    סוג מדידה:
                    <select
                      name="type"
                      defaultValue="units"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '2px solid #333333',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="units">יחידות</option>
                      <option value="kg">ק"ג</option>
                    </select>
                  </label>
                </div>

                {/* Category Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    קטגוריית מוצר:
                    <select
                      name="category"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '2px solid #333333',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff'
                      }}
                      defaultValue=""
                    >
                      <option value="">בחר קטגוריה (אופציונלי)</option>
                      {allCategories.map((category, index) => (
                        <option key={index} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  
                  {/* Add Custom Category Button */}
                  <div style={{ marginTop: '10px' }}>
                    {!showAddCategoryForm ? (
                      <button
                        type="button"
                        onClick={() => setShowAddCategoryForm(true)}
                        style={{
                          background: '#4CAF50',
                          color: 'white',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        הוסף קטגוריה חדשה
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="שם הקטגוריה החדשה"
                          style={{
                            flex: 1,
                            padding: '8px',
                            border: '2px solid #333333',
                            borderRadius: '4px',
                            color: '#000000',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          style={{
                            background: '#4CAF50',
                            color: 'white',
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          הוסף
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCategoryForm(false);
                            setNewCategoryName('');
                          }}
                          style={{
                            background: '#f44336',
                            color: 'white',
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ביטול
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Refrigerator Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' }}>
                    מקרר:
                    <select
                      name="fridgeId"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        marginTop: '5px',
                        border: '2px solid #333333',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff'
                      }}
                      defaultValue=""
                    >
                      <option value="">בחר מקרר (אופציונלי)</option>
                      {fridges.map((fridge) => (
                        <option key={fridge.id} value={fridge.id}>
                          {fridge.name} ({fridge.department === 'bar' ? 'בר' : 'מטבח'})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                      width: '65%',
                      padding: '12px',
                      background: '#228B22',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    {loading ? 'מוסיף...' : 'הוסף מוצר'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      width: '30%',
                      padding: '12px',
                      background: '#9E9E9E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {editMode && selectedProduct && (
            <div className="edit-product-form">
              <h3>עריכת מוצר</h3>
              <form onSubmit={handleUpdateProduct}>
                <div className="form-group">
                  <label htmlFor="edit-productId">מזהה מוצר</label>
                  <input
                    type="text"
                    id="edit-productId"
                    value={selectedProduct?.productId || ''}
                    disabled={true}
                    style={{
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '10px',
                      background: '#f0f0f0',
                      zIndex: 100,
                      position: 'relative'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-name">שם מוצר</label>
                  <input
                    type="text"
                    id="edit-name"
                    ref={editNameInputRef}
                    defaultValue={selectedProduct?.name || ''}
                    required
                    disabled={loading}
                    placeholder="הזן שם מוצר"
                    style={{
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '10px',
                      border: '2px solid #2196F3',
                      zIndex: 100,
                      position: 'relative'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-shelfLifeDays">תוקף בימים</label>
                  <input
                    type="number"
                    id="edit-shelfLifeDays"
                    ref={editExpiryInputRef}
                    defaultValue={selectedProduct?.shelfLifeDays || 0}
                    min="1"
                    required
                    disabled={loading}
                    placeholder="מספר ימים עד לפקיעת תוקף"
                    style={{
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '10px',
                      border: '2px solid #2196F3',
                      zIndex: 100,
                      position: 'relative'
                    }}
                  />
                </div>
                
                <div className="form-group">
                  <label>אזור</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="edit-area"
                        value="bar"
                        checked={selectedProduct?.area === 'bar'}
                        onChange={() => setSelectedProduct(prev => prev ? {...prev, area: 'bar'} : null)}
                        disabled={loading}
                      />
                      בר
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="edit-area"
                        value="kitchen"
                        checked={selectedProduct?.area === 'kitchen'}
                        onChange={() => setSelectedProduct(prev => prev ? {...prev, area: 'kitchen'} : null)}
                        disabled={loading}
                      />
                      מטבח
                    </label>
                  </div>
                </div>
                
                <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                    style={{
                      flex: '2',
                      padding: '12px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? 'מעדכן...' : 'עדכן מוצר'}
                  </button>
                  
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setEditMode(false);
                    }}
                    disabled={loading}
                    style={{
                      flex: '1',
                      padding: '12px',
                      background: '#9E9E9E',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="products-list">
            <h3>רשימת מוצרים</h3>
            {loading && !editMode && <p>טוען מוצרים...</p>}
            
            {products.length === 0 ? (
              <div className="no-products">
                {canManageAllDepartments ? (
                  <p>לא נמצאו מוצרים.</p>
                ) : userDepartment ? (
                  <p>לא נמצאו מוצרים עבור מחלקת {userDepartment === 'bar' ? 'הבר' : 'המטבח'}.</p>
                ) : (
                  <p>לא נמצאו מוצרים.</p>
                )}
              </div>
            ) : (
              <table className="products-table">
                <thead>
                  <tr>
                    <th>מזהה מוצר</th>
                    <th>שם</th>
                    <th>תוקף בימים</th>
                    <th>אזור</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.productId}</td>
                      <td>{product.name}</td>
                      <td>{product.shelfLifeDays}</td>
                      <td>{product.area === 'bar' ? 'בר' : 'מטבח'}</td>
                      <td className="actions-cell">
                        <button
                          className="edit-button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setEditMode(true);
                            setShowAddForm(false); // Ensure add form is hidden
                            setSuccess(null);
                            setError(null);
                            // Set default values in the edit form input refs
                            setTimeout(() => {
                              if (editNameInputRef.current) editNameInputRef.current.value = product.name;
                              if (editExpiryInputRef.current) editExpiryInputRef.current.value = product.shelfLifeDays.toString();
                            }, 0);
                          }}
                          disabled={loading}
                        >
                          ערוך
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => product.id && handleDeleteProduct(product.id)}
                          disabled={loading}
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      
      <style>{`
        /* Base styles */
        .product-management {
          margin-top: 20px;
          color: #000000;
          text-align: right;
          font-family: sans-serif;
        }
        
        .product-management h2 {
          color: #000000;
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
        }
        
        .product-management h3 {
          color: #000000;
          font-size: 20px;
          margin-bottom: 15px;
          font-weight: bold;
        }
        
        .product-management p,
        .product-management label,
        .product-management th,
        .product-management td,
        .product-management input,
        .product-management select {
          color: #000000;
          font-weight: bold;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #000;
        }
        
        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #000;
          font-size: 16px;
        }
        
        /* Hebrew text inputs */
        input[type="text"] {
          text-align: right;
          direction: rtl;
        }
        
        /* Number inputs should be LTR for better usability */
        input[type="number"] {
          text-align: left;
          direction: ltr;
        }
        
        .form-input {
          border: 2px solid #2196F3;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .form-input:focus {
          outline: none;
          border-color: #1976D2;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
        }
        
        .readonly-input {
          background-color: #f0f0f0;
          cursor: not-allowed;
          border: 1px solid #ccc;
          text-align: right;
          direction: rtl;
        }
        
        .radio-group {
          display: flex;
          gap: 20px;
        }
        
        .radio-group label {
          display: flex;
          alignItems: center;
          font-weight: normal;
          color: #000;
        }
        
        .radio-group input {
          width: auto;
          margin-left: 8px;
        }
        
        .submit-button, .action-button, .edit-button, .delete-button, .cancel-button {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.3s;
          font-size: 16px;
        }
        
        .submit-button {
          background-color: #4CAF50;
          color: white;
          width: 100%;
        }
        
        .submit-button:hover {
          background-color: #388E3C;
        }
        
        .action-button {
          background-color: #2196F3;
          color: white;
          margin-bottom: 20px;
        }
        
        .action-button:hover {
          background-color: #1976D2;
        }
        
        .cancel-button {
          background-color: #9E9E9E;
          color: white;
          margin-right: 10px;
        }
        
        .cancel-button:hover {
          background-color: #757575;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-start;
        }
        
        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-weight: bold;
          font-size: 16px;
        }
        
        .error {
          background-color: #FFD2D2;
          color: #D50000;
          border: 1px solid #FF5252;
        }
        
        .success {
          background-color: #C8E6C9;
          color: #1B5E20;
          border: 1px solid #4CAF50;
        }
        
        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background-color: white;
          border: 2px solid #444444;
        }
        
        .products-table th, .products-table td {
          padding: 12px;
          border: 1px solid #555555;
          text-align: right;
          color: #000000;
          font-weight: bold;
        }
        
        .products-table th {
          background-color: #333333;
          font-weight: bold;
          color: #ffffff;
        }
        
        .products-table tr:nth-child(even) {
          background-color: #f0f0f0;
        }
        
        .actions-cell {
          display: flex;
          gap: 5px;
        }
        
        .edit-button {
          background-color: #FF9800;
          color: white;
        }
        
        .edit-button:hover {
          background-color: #F57C00;
        }
        
        .delete-button {
          background-color: #F44336;
          color: white;
        }
        
        .delete-button:hover {
          background-color: #D32F2F;
        }
        
        ::placeholder {
          color: #555555;
          opacity: 1;
        }
        
        /* Fix for number input */
        input[type="number"] {
          -moz-appearance: textfield;
          color: #000000 !important;
          background-color: white !important;
        }
        
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { 
          -webkit-appearance: none;
          margin: 0;
        }
        
        /* Troubleshooting styles */
        input[type="text"], input[type="number"] {
          pointer-events: auto !important;
          cursor: text !important;
          user-select: auto !important;
          color: #000000 !important;
        }
        
        /* Fix for possible interference */
        * {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export default ProductManagement;
