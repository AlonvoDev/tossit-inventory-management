import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBusinessProducts, addProduct, updateProduct, deleteProduct } from '../api/productsAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { getBusinessCategories, addCustomCategory } from '../api/categoriesAPI';
import { Product, PRODUCT_CATEGORIES } from '../types/Product';
import { Fridge } from '../types/Fridge';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon, Edit as EditIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';
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
import { ManagementList, ManagementRow, Tag } from './layout/ManagementList';

interface ProductManagementProps {
  isOffline?: boolean;
}

const FIELD = { '& .MuiInputBase-root': { minHeight: 48 } } as const;

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
    <Box dir="rtl">
      {/* The surrounding admin tab provides the "ניהול מוצרים" heading. */}
      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

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
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disabled={disabled} sx={{ minHeight: 44, mb: 2 }}>
          הוסף מוצר חדש
        </Button>
      )}

      {formOpen && (
        // V3: MUI fields in the shared visual language (was raw inputs with their own bold styling).
        <Box
          component="section"
          aria-labelledby="product-form-title"
          sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, border: 1, borderColor: 'divider', borderRadius: 2, maxWidth: 640 }}
        >
          <Typography id="product-form-title" component="h3" sx={{ fontWeight: 700, fontSize: '1.0625rem', mb: 2 }}>
            {editing ? 'עריכת מוצר' : 'הוספת מוצר חדש'}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            aria-label={editing ? 'עריכת מוצר' : 'הוספת מוצר'}
            sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
          >
            <TextField
              label="מזהה מוצר"
              value={editing ? editing.productId : nextCode}
              InputProps={{ readOnly: true }}
              inputProps={{ dir: 'ltr' }}
              helperText="נקבע אוטומטית"
              sx={FIELD}
            />
            <TextField
              label="שם מוצר"
              name="name"
              required
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="הזן שם מוצר"
              disabled={saving}
              error={!!formErrors.name}
              helperText={formErrors.name}
              FormHelperTextProps={{ role: formErrors.name ? 'alert' : undefined }}
              sx={FIELD}
            />
            <TextField
              label="תוקף בימים"
              name="shelfLifeDays"
              type="number"
              required
              value={form.shelfLifeDays}
              onChange={e => setField('shelfLifeDays', e.target.value)}
              disabled={saving}
              error={!!formErrors.shelfLifeDays}
              helperText={formErrors.shelfLifeDays}
              FormHelperTextProps={{ role: formErrors.shelfLifeDays ? 'alert' : undefined }}
              inputProps={{ inputMode: 'numeric', min: 1, step: 1, dir: 'ltr' }}
              sx={FIELD}
            />
            <TextField
              select
              label="מחלקה"
              name="department"
              required
              value={form.area}
              onChange={e => setField('area', e.target.value as Department | '')}
              disabled={saving || allowedDepartments.length === 1}
              error={!!formErrors.area}
              helperText={formErrors.area}
              FormHelperTextProps={{ role: formErrors.area ? 'alert' : undefined }}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={FIELD}
            >
              <option value="" disabled>בחר מחלקה</option>
              {allowedDepartments.map(d => (
                <option key={d} value={d}>{departmentLabel(d)}</option>
              ))}
            </TextField>
            <TextField
              select
              label="סוג מדידה"
              name="type"
              value={form.type}
              onChange={e => setField('type', e.target.value as 'kg' | 'units')}
              disabled={saving || !!editing}
              title={editing ? 'לא ניתן לשנות סוג מדידה למוצר קיים' : undefined}
              error={!!formErrors.type}
              helperText={formErrors.type ?? (editing ? 'לא ניתן לשנות למוצר קיים' : undefined)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={FIELD}
            >
              <option value="units">יחידות</option>
              <option value="kg">ק"ג</option>
            </TextField>
            <TextField
              select
              label="מקרר"
              name="fridgeId"
              value={form.fridgeId}
              onChange={e => setField('fridgeId', e.target.value)}
              disabled={saving}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              sx={FIELD}
            >
              <option value="">ללא מקרר (אופציונלי)</option>
              {fridgeOptions.map(fridge => (
                <option key={fridge.id} value={fridge.id}>
                  {fridge.name} ({departmentLabel(fridge.department) ?? '?'})
                </option>
              ))}
            </TextField>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                select
                fullWidth
                label="קטגוריית מוצר"
                name="category"
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                disabled={saving}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                sx={FIELD}
              >
                <option value="">ללא קטגוריה (אופציונלי)</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </TextField>
              {isBusinessAdmin && (
                <Box sx={{ mt: 1 }}>
                  {!showAddCategoryForm ? (
                    <Button variant="text" startIcon={<AddIcon />} onClick={() => setShowAddCategoryForm(true)} disabled={disabled}>
                      הוסף קטגוריה חדשה
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        label="שם הקטגוריה החדשה"
                        placeholder="שם הקטגוריה החדשה"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        sx={{ flex: '1 1 200px', '& .MuiInputBase-root': { minHeight: 44 } }}
                      />
                      <Button variant="contained" onClick={handleAddCategory} disabled={disabled || !newCategoryName.trim()}>
                        הוסף
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setShowAddCategoryForm(false);
                          setNewCategoryName('');
                        }}
                      >
                        ביטול
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
            <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, mt: 0.5 }}>
              <Button type="submit" variant="contained" disabled={disabled} sx={{ flex: { xs: 2, sm: '0 0 auto' }, minHeight: 48, px: 3 }}>
                {saving ? 'שומר...' : editing ? 'עדכן מוצר' : 'הוסף מוצר'}
              </Button>
              <Button type="button" variant="outlined" onClick={closeForm} disabled={saving} sx={{ flex: { xs: 1, sm: '0 0 auto' }, minHeight: 48 }}>
                ביטול
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1.5 }}>
        רשימת מוצרים{!loading && products.length > 0 ? ` (${products.length})` : ''}
      </Typography>
      {loading ? (
        <Typography role="status">טוען מוצרים...</Typography>
      ) : products.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700 }}>
            {allowedDepartments.length === 1
              ? `לא נמצאו מוצרים עבור מחלקת ${departmentLabel(allowedDepartments[0])}.`
              : 'לא נמצאו מוצרים.'}
          </Typography>
        </Box>
      ) : (
        <ManagementList>
          {products.map(product => {
            const fridge = product.fridgeId ? fridges.find(f => f.id === product.fridgeId) : undefined;
            return (
              <ManagementRow
                key={product.id}
                label={product.name}
                headingComponent="h4"
                title={product.name}
                subtitle={
                  <Box component="span" dir="ltr" sx={{ unicodeBidi: 'isolate' }}>
                    {product.productId}
                  </Box>
                }
                tags={
                  <>
                    <Tag tone="primary">{`${product.shelfLifeDays} ימים`}</Tag>
                    <Tag>{product.type === 'kg' ? 'ק״ג' : 'יחידות'}</Tag>
                    <Tag>{departmentLabel(product.area) ?? 'לא הוגדר'}</Tag>
                    {fridge && <Tag>{fridge.name}</Tag>}
                  </>
                }
                actions={
                  canEdit ? (
                    <>
                      <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(product)} disabled={disabled}
                        aria-label={`עריכה — ${product.name}`} sx={{ minHeight: 44 }}>
                        עריכה
                      </Button>
                      <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteProduct(product)} disabled={disabled}
                        aria-label={`מחיקה — ${product.name}`} sx={{ minHeight: 44 }}>
                        מחיקה
                      </Button>
                    </>
                  ) : undefined
                }
              />
            );
          })}
        </ManagementList>
      )}

    </Box>
  );
};

export default ProductManagement;
