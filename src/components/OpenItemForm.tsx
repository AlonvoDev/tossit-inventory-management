import React, { useState, useEffect } from 'react';
import { addItem } from '../api/firestoreAPI';
import { Product } from '../types/Product';
import { useAuth } from '../context/AuthContext';
import { getBusinessProducts } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { Fridge } from '../types/Fridge';
import { 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  TextField, 
  Button, 
  Alert, 
  Box, 
  Typography,
  Grid as MuiGrid,
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';

// Easier to use Grid component with proper typing
const Grid = (props: any) => <MuiGrid {...props} />;

interface OpenItemFormProps {
  businessId?: string;
  userId?: string;
  onItemAdded?: () => void;
  onError?: (error: string) => void;
  defaultArea?: string;
  areas?: string[];
  area?: string;
  disabled?: boolean;
}

const OpenItemForm: React.FC<OpenItemFormProps> = ({
  businessId: propBusinessId,
  userId: propUserId,
  onItemAdded,
  onError,
  defaultArea,
  area: areaFilter,
  disabled = false,
  areas = ['מטבח', 'בר', 'מחסן', 'אחר'],
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [area, setArea] = useState<string>(defaultArea || areaFilter || areas[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [usingCachedProducts, setUsingCachedProducts] = useState(false);

  // List of fridges available to the business
  const [fridges, setFridges] = useState<Fridge[]>([]);
  // Selected fridge ID for this item
  const [selectedFridgeId, setSelectedFridgeId] = useState<string>('');
  
  const { user, profile, businessId: authBusinessId } = useAuth();
  
  const businessId = propBusinessId || authBusinessId || profile?.businessId;
  const userId = propUserId || user?.uid;
  
  // Get user's department for filtering products
  const userDepartment = profile?.department;

  // Update area when areaFilter changes
  useEffect(() => {
    if (areaFilter && areaFilter !== area) {
      setArea(areaFilter);
    }
  }, [areaFilter, area]);
  
  // Load products from Firestore
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    const loadProducts = async () => {
      try {
        // First try to get cached products
        const cachedProducts = localStorage.getItem(`products_${businessId}`);
        let productsData: Product[] = [];
        
        if (cachedProducts) {
          productsData = JSON.parse(cachedProducts);
          
          // Filter cached products by user's department
          if (userDepartment) {
            productsData = productsData.filter(product => product.area === userDepartment);
          }
          
          if (isMounted) {
            setProducts(productsData);
            setUsingCachedProducts(true);
          }
        }
        
        // Then try to get from Firestore
        if (businessId && navigator.onLine && !disabled) {
          const firestoreProducts = await getBusinessProducts(businessId);
          
          // Filter Firestore products by user's department
          let filteredProducts = firestoreProducts;
          if (userDepartment) {
            filteredProducts = firestoreProducts.filter(product => product.area === userDepartment);
          }
          
          if (isMounted) {
            setProducts(filteredProducts);
            setUsingCachedProducts(false);
            
            // Update cache with filtered products
            localStorage.setItem(`products_${businessId}_${userDepartment || 'all'}`, JSON.stringify(filteredProducts));
          }
        } else if (!navigator.onLine || disabled) {
          setIsOfflineMode(true);
        }
      } catch (error: any) {
        console.error('Error loading products:', error);
        if (isMounted) {
          setError(`Failed to load products: ${error.message}`);
          setIsOfflineMode(!navigator.onLine || disabled);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Only load products if we have user department info
    if (profile) {
      loadProducts();
    }
    
    return () => {
      isMounted = false;
    };
  }, [businessId, disabled, userDepartment, profile]);

  // Load fridges from Firestore for fridge selection
  useEffect(() => {
    let isMounted = true;
    const loadFridges = async () => {
      if (!businessId || !navigator.onLine || disabled) {
        return;
      }
      try {
        const data = await getBusinessFridges(businessId);
        // Filter fridges by area if user selects an area or has a department
        let filtered = data;
        // Determine area/department to filter by (Hebrew values)
        const currentArea = areaFilter || area;
        const areaNormalized = currentArea === 'בר' || currentArea === 'bar' ? 'bar' : currentArea === 'מטבח' || currentArea === 'kitchen' ? 'kitchen' : undefined;
        if (areaNormalized) {
          filtered = data.filter((f) => f.department === areaNormalized);
        }
        if (isMounted) {
          setFridges(filtered);
        }
      } catch (err) {
        console.error('Error loading fridges:', err);
      }
    };
    loadFridges();
    return () => {
      isMounted = false;
    };
  }, [businessId, area, areaFilter, disabled]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      setError('יש לבחור מוצר');
      return;
    }
    
    if (amount <= 0) {
      setError('יש להוסיף כמות תקינה');
      return;
    }
    
    if (!businessId) {
      setError('לא זוהה עסק');
      return;
    }
    
    if (!userId || !user) {
      setError('יש להתחבר מחדש');
      return;
    }

    if (!selectedFridgeId) {
      setError('יש לבחור מקרר');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      // Check if we're in offline mode
      if (!navigator.onLine || disabled) {
        // Store the pending operation
        const pendingOperations = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
        pendingOperations.push({
          type: 'add',
          data: {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            amount,
            area,
            businessId,
            userId,
            fridgeId: selectedFridgeId,
            timestamp: new Date().toISOString(),
          }
        });
        localStorage.setItem('pendingOperations', JSON.stringify(pendingOperations));
        
        setSuccess('הפריט נוסף למאגר מקומי ויסונכרן כאשר יחזור החיבור לאינטרנט');
        setIsOfflineMode(true);
        
        if (onItemAdded) {
          onItemAdded();
        }
      } else {
        // Extra validation to prevent undefined values
        const productId = selectedProduct.id;
        const productName = selectedProduct.name;
        
        if (!productId || !productName || !businessId || !userId) {
          console.error('Missing required parameters:', {
            productId,
            productName,
            businessId,
            userId,
            amount,
            area
          });
          setError('חסרים נתונים נדרשים. נסה לטעון את הדף מחדש.');
          return;
        }
        
        console.log('Adding item with parameters:', {
          productId,
          productName,
          amount,
          area,
          businessId,
          userId
        });
        
        const itemId = await addItem(productId, productName, amount, area, businessId, userId, selectedFridgeId);
        console.log('Item added successfully with ID:', itemId);
        setSuccess('הפריט נוסף בהצלחה');
        
        console.log('Item added successfully - calling onItemAdded callback');
        console.log('Added item details:', { productId, productName, amount, area, businessId, userId });
        if (onItemAdded) {
          onItemAdded();
          console.log('onItemAdded callback called');
        } else {
          console.warn('onItemAdded callback not provided');
        }
      }
      
      // Reset form
      setSelectedProduct(null);
      setAmount(1);
      setSelectedFridgeId('');
    } catch (error: any) {
      console.error('Error adding item:', error);
      const errorMessage = error?.message || 'אירעה שגיאה בהוספת הפריט';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      // If we get a network error, try to store offline
      if (error.code === 'unavailable' || error.message.includes('network') || !navigator.onLine) {
        setIsOfflineMode(true);
        // Store the pending operation
        const pendingOperations = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
        pendingOperations.push({
          type: 'add',
          data: {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            amount,
            area,
            businessId,
            userId,
            fridgeId: selectedFridgeId,
            timestamp: new Date().toISOString(),
          }
        });
        localStorage.setItem('pendingOperations', JSON.stringify(pendingOperations));
        
        setSuccess('הפריט נוסף למאגר מקומי ויסונכרן כאשר יחזור החיבור לאינטרנט');
        
        if (onItemAdded) {
          onItemAdded();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle area change
  const handleAreaChange = (e: SelectChangeEvent<string>) => {
    setArea(e.target.value);
  };
  
  // Handle product change
  const handleProductChange = (e: SelectChangeEvent<string>) => {
    const productId = e.target.value;
    const product = products.find(p => p.id === productId) || null;
    setSelectedProduct(product);
  };
  
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        mb: 2,
      }}
    >
      {(isOfflineMode || disabled) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          אתה במצב לא מקוון. הפריטים ישמרו מקומית ויסונכרנו כשהחיבור יחזור.
        </Alert>
      )}
      
      {usingCachedProducts && (
        <Alert severity="info" sx={{ mb: 2 }}>
          מציג מוצרים מהמטמון המקומי.
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Typography variant="h6" gutterBottom>
        הוספת פריט חדש
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="normal" disabled={isLoading || disabled}>
            <InputLabel id="area-select-label">אזור</InputLabel>
            <Select
              labelId="area-select-label"
              id="area-select"
              value={area}
              label="אזור"
              onChange={handleAreaChange}
            >
              {areas.map((areaOption) => (
                <MenuItem key={areaOption} value={areaOption}>
                  {areaOption}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="normal" disabled={isLoading || disabled}>
            <InputLabel id="product-select-label">מוצר</InputLabel>
            <Select
              labelId="product-select-label"
              id="product-select"
              value={selectedProduct?.id || ''}
              label="מוצר"
              onChange={handleProductChange}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
            {products.length === 0 && !isLoading && (
              <FormHelperText error>
                {userDepartment 
                  ? `אין מוצרים זמינים עבור מחלקת ${userDepartment === 'bar' ? 'הבר' : 'המטבח'}`
                  : 'אין מוצרים זמינים'
                }
              </FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Fridge selection */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="normal" disabled={isLoading || disabled || fridges.length === 0}>
            <InputLabel id="fridge-select-label">מקרר</InputLabel>
            <Select
              labelId="fridge-select-label"
              id="fridge-select"
              value={selectedFridgeId}
              label="מקרר"
              onChange={(e) => setSelectedFridgeId(e.target.value as string)}
            >
              {fridges.length === 0 && (
                <MenuItem value="" disabled>
                  אין מקררים זמינים
                </MenuItem>
              )}
              {fridges.map((fridge) => (
                <MenuItem key={fridge.id} value={fridge.id || ''}>
                  {fridge.name}
                </MenuItem>
              ))}
            </Select>
            {fridges.length === 0 && (
              <FormHelperText error>
                אין מקררים זמינים עבור אזור {area}
              </FormHelperText>
            )}
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="כמות"
            type="number"
            inputProps={{ min: 1, dir: 'ltr' }}
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            margin="normal"
            disabled={isLoading || disabled}
            sx={{ 
              '& input': { color: 'text.primary' },
              '& label': { color: 'text.secondary' }
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={isLoading || !selectedProduct || disabled}
            sx={{ mt: 2 }}
          >
            {isLoading ? 'מוסיף...' : 'הוסף פריט'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OpenItemForm;
