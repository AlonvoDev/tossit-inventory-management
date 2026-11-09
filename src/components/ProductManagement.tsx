import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBusinessProducts, addProduct, updateProduct, deleteProduct } from '../api/productsAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { getBusinessCategories, addCustomCategory } from '../api/categoriesAPI';
import { Product, PRODUCT_CATEGORIES } from '../types/Product';
import { Fridge } from '../types/Fridge';
import { Alert } from '@mui/material';
import { WifiOff as WifiOffIcon } from '@mui/icons-material';
import {
  canManageBusiness,
  Department,
  departmentLabel,
  manageableDepartments,
  normalizeDepartment,
} from '../app/access';
import {
  nextProductCode,
  parseShelfLifeDays,
  ProductFormErrors,
  ProductFormValues,
  validateProductForm,
} from '../features/catalog/productForm';
import { errorMessage } from '../features/common/errorMessage';

interface ProductManagementProps {
  isOffline?: boolean;
}

const fieldStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '8px',
  marginTop: '5px',
  border: hasError ? '2px solid #f44336' : '2px solid #333333',
  color: '#000000',
  fontSize: '16px',
  fontWeight: 'bold',
  backgroundColor: '#ffffff',
});

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#000000' };

const FieldError: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <div role="alert" style={{ color: '#f44336', fontSize: '14px', marginTop: '5px', fontWeight: 'normal' }}>
      {text}
    </div>
  ) : null;

/**
 * Catalog management for admins (all departments) and managers (own department only).
 * Changes require a connection: there is no local queue or offline success for catalog edits.
 */
const ProductManagement: React.FC<ProductManagementProps> = () => {
  const { businessId, profile, role, isOffline, loading: authLoading } = useAuth();
  const allowedDepartments = useMemo(
    () => manageableDepartments(role, profile?.department),
    [role, profile?.department],
  );
  const isBusinessAdmin = canManageBusiness(role);

  const emptyForm = useCallback(
    (): ProductFormValues => ({
      name: '',
      shelfLifeDays: '1',
      type: 'units',
      area: allowedDepartments.length === 1 ? allowedDepartments[0] : '',
      category: '',
      fridgeId: '',
    }),
    [allowedDepartments],
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([...PRODUCT_CATEGORIES]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});

  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const inScope = useCallback(
    (department: unknown) => {
      const normalized = normalizeDepartment(department);
      return normalized !== null && allowedDepartments.includes(normalized);
    },
    [allowedDepartments],
  );

  const loadProducts = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const fetched = await getBusinessProducts(businessId);
      // Legacy Hebrew department values stay visible to the matching department.
      setProducts(fetched.filter(p => inScope(p.area)));
    } catch (err) {
      console.error('Error loading products:', err);
      setError(errorMessage(err, 'טעינת המוצרים נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  }, [businessId, inScope]);

  useEffect(() => {
    if (!authLoading && profile) {
      loadProducts();
    }
  }, [authLoading, profile, loadProducts]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      try {
        const [fridgesData, customCategories] = await Promise.all([
          getBusinessFridges(businessId),
          getBusinessCategories(businessId),
        ]);
        if (cancelled) return;
        setFridges(fridgesData.filter(f => inScope(f.department)));
        setAllCategories([...PRODUCT_CATEGORIES, ...customCategories.map(c => c.name)]);
      } catch (err) {
        console.error('Error loading fridges and categories:', err);
        if (!cancelled) setError(errorMessage(err, 'טעינת המקררים והקטגוריות נכשלה.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, inScope]);

  const nextCode = useMemo(() => nextProductCode(products), [products]);

  const setField = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // A fridge must belong to the product's department.
      if (key === 'area' && prev.fridgeId) {
        const fridge = fridges.find(f => f.id === prev.fridgeId);
        if (fridge && normalizeDepartment(fridge.department) !== value) next.fridgeId = '';
      }
      return next;
    });
    setFormErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      shelfLifeDays: String(product.shelfLifeDays ?? ''),
      type: product.type === 'kg' ? 'kg' : 'units',
      area: normalizeDepartment(product.area) ?? '',
      category: product.category || '',
      fridgeId: product.fridgeId || '',
    });
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSuccess(null);
    if (isOffline) {
      setError('אין חיבור. שינויים בקטלוג נשמרים רק כשיש חיבור לשרת.');
      return;
    }
    const errors = validateProductForm(form, allowedDepartments);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !businessId) {
      setError(businessId ? 'יש לתקן את השגיאות בטופס' : 'לא נמצא עסק עבור החשבון שלך');
      return;
    }
    const shelfLifeDays = parseShelfLifeDays(form.shelfLifeDays)!;
    const area = form.area as Department;
    const name = form.name.trim();

    setSaving(true);
    try {
      if (editing?.id) {
        await updateProduct(editing.id, {
          name,
          shelfLifeDays,
          area,
          type: form.type as 'kg' | 'units',
          category: form.category || undefined,
          fridgeId: form.fridgeId || undefined,
        });
        setSuccess(`המוצר "${name}" עודכן`);
      } else {
        await addProduct({
          productId: nextCode,
          name,
          shelfLifeDays,
          type: form.type as 'kg' | 'units',
          area,
          businessId,
          category: form.category || undefined,
          fridgeId: form.fridgeId || undefined,
        });
        setSuccess(`המוצר "${name}" נוסף`);
      }
      closeForm();
      await loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(errorMessage(err, 'שמירת המוצר נכשלה. נסה שוב.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!product.id || isOffline) return;
    if (!window.confirm(`למחוק את המוצר "${product.name}" מהקטלוג?\nפריטים שכבר נפתחו נשארים ברשימת המלאי.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteProduct(product.id);
      setSuccess(`המוצר "${product.name}" נמחק מהקטלוג`);
      await loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(errorMessage(err, 'מחיקת המוצר נכשלה. נסה שוב.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !businessId || !isBusinessAdmin) return;
    if (allCategories.some(c => c === name)) {
      setError(`הקטגוריה "${name}" כבר קיימת`);
      return;
    }
    try {
      await addCustomCategory({ name, businessId, createdBy: profile?.email });
      const customCategories = await getBusinessCategories(businessId);
      setAllCategories([...PRODUCT_CATEGORIES, ...customCategories.map(c => c.name)]);
      setField('category', name);
      setNewCategoryName('');
      setShowAddCategoryForm(false);
      setSuccess(`הקטגוריה "${name}" נוספה`);
    } catch (err) {
      console.error('Error adding category:', err);
      setError(errorMessage(err, 'הוספת הקטגוריה נכשלה.'));
    }
  };

  const fridgeOptions = fridges.filter(f => !form.area || normalizeDepartment(f.department) === form.area);
  const disabled = saving || !!isOffline;
  const canEdit = allowedDepartments.length > 0;

  return (
    <div className="product-management" dir="rtl">
      <h2>ניהול מוצרים</h2>

      {error && <div className="alert error" role="alert">{error}</div>}
      {success && <div className="alert success" role="status">{success}</div>}

      {isOffline && (
        <Alert severity="warning" icon={<WifiOffIcon />} sx={{ mb: 2 }}>
          אין חיבור. ניתן לצפות בקטלוג, אך הוספה, עריכה ומחיקה זמינות רק כשיש חיבור.
        </Alert>
      )}

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          אין לך הרשאה לנהל את קטלוג המוצרים.
        </Alert>
      )}

      {allowedDepartments.length === 1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          מוצגים ומנוהלים מוצרי מחלקת {departmentLabel(allowedDepartments[0])} בלבד.
        </Alert>
      )}

      {canEdit && !formOpen && (
        <div className="product-actions">
          <button
            className="action-button"
            onClick={openAdd}
            disabled={disabled}
            style={{
              background: disabled ? '#9E9E9E' : '#2196F3',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              marginBottom: '20px',
            }}
          >
            הוסף מוצר חדש
          </button>
        </div>
      )}

      {formOpen && (
        <div className={editing ? 'edit-product-form' : 'add-product-form'}>
          <h3>{editing ? 'עריכת מוצר' : 'הוספת מוצר חדש'}</h3>
          <form onSubmit={handleSubmit} noValidate aria-label={editing ? 'עריכת מוצר' : 'הוספת מוצר'}>
            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                מזהה מוצר:
                <input type="text" value={editing ? editing.productId : nextCode} readOnly style={{ ...fieldStyle(false), background: '#f0f0f0' }} />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                שם מוצר: <span style={{ color: 'red' }}>*</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="הזן שם מוצר"
                  disabled={saving}
                  style={fieldStyle(!!formErrors.name)}
                />
                <FieldError text={formErrors.name} />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                תוקף בימים: <span style={{ color: 'red' }}>*</span>
                <input
                  type="number"
                  name="shelfLifeDays"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={form.shelfLifeDays}
                  onChange={e => setField('shelfLifeDays', e.target.value)}
                  disabled={saving}
                  style={fieldStyle(!!formErrors.shelfLifeDays)}
                />
                <FieldError text={formErrors.shelfLifeDays} />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                מחלקה: <span style={{ color: 'red' }}>*</span>
                <select
                  name="department"
                  value={form.area}
                  onChange={e => setField('area', e.target.value as Department | '')}
                  disabled={saving || allowedDepartments.length === 1}
                  style={fieldStyle(!!formErrors.area)}
                >
                  <option value="" disabled>בחר מחלקה</option>
                  {allowedDepartments.map(d => (
                    <option key={d} value={d}>{departmentLabel(d)}</option>
                  ))}
                </select>
                <FieldError text={formErrors.area} />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                סוג מדידה:
                <select
                  name="type"
                  value={form.type}
                  onChange={e => setField('type', e.target.value as 'kg' | 'units')}
                  disabled={saving || !!editing}
                  title={editing ? 'לא ניתן לשנות סוג מדידה למוצר קיים' : undefined}
                  style={fieldStyle(!!formErrors.type)}
                >
                  <option value="units">יחידות</option>
                  <option value="kg">ק"ג</option>
                </select>
                <FieldError text={formErrors.type} />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                קטגוריית מוצר:
                <select
                  name="category"
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                  disabled={saving}
                  style={fieldStyle(false)}
                >
                  <option value="">בחר קטגוריה (אופציונלי)</option>
                  {allCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              {isBusinessAdmin && (
                <div style={{ marginTop: '10px' }}>
                  {!showAddCategoryForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryForm(true)}
                      disabled={disabled}
                      style={{ background: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      הוסף קטגוריה חדשה
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="שם הקטגוריה החדשה"
                        style={{ ...fieldStyle(false), flex: 1, marginTop: 0 }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={disabled || !newCategoryName.trim()}
                        style={{ background: '#4CAF50', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        הוסף
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryForm(false);
                          setNewCategoryName('');
                        }}
                        style={{ background: '#f44336', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ביטול
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={labelStyle}>
                מקרר:
                <select
                  name="fridgeId"
                  value={form.fridgeId}
                  onChange={e => setField('fridgeId', e.target.value)}
                  disabled={saving}
                  style={fieldStyle(false)}
                >
                  <option value="">בחר מקרר (אופציונלי)</option>
                  {fridgeOptions.map(fridge => (
                    <option key={fridge.id} value={fridge.id}>
                      {fridge.name} ({departmentLabel(fridge.department) ?? '?'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={disabled}
                style={{ width: '65%', padding: '12px', background: disabled ? '#9E9E9E' : '#228B22', color: 'white', border: 'none', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              >
                {saving ? 'שומר...' : editing ? 'עדכן מוצר' : 'הוסף מוצר'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{ width: '30%', padding: '12px', background: '#9E9E9E', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="products-list">
        <h3>רשימת מוצרים</h3>
        {loading && <p>טוען מוצרים...</p>}

        {!loading && products.length === 0 ? (
          <div className="no-products">
            <p>
              {allowedDepartments.length === 1
                ? `לא נמצאו מוצרים עבור מחלקת ${departmentLabel(allowedDepartments[0])}.`
                : 'לא נמצאו מוצרים.'}
            </p>
          </div>
        ) : (
          products.length > 0 && (
            <table className="products-table">
              <thead>
                <tr>
                  <th>מזהה מוצר</th>
                  <th>שם</th>
                  <th>תוקף בימים</th>
                  <th>סוג</th>
                  <th>אזור</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>{product.productId}</td>
                    <td>{product.name}</td>
                    <td>{product.shelfLifeDays}</td>
                    <td>{product.type === 'kg' ? 'ק"ג' : 'יחידות'}</td>
                    <td>{departmentLabel(product.area) ?? 'לא הוגדר'}</td>
                    <td className="actions-cell">
                      <button className="edit-button" onClick={() => openEdit(product)} disabled={disabled}>
                        ערוך
                      </button>
                      <button className="delete-button" onClick={() => handleDeleteProduct(product)} disabled={disabled}>
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

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
