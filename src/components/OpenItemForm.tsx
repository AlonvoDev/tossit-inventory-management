import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getBusinessProducts } from '../api/productsAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { openInventoryItem } from '../api/inventoryOperations';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';
import type { Department, WriteReceipt } from '../domain/contracts';
import { departmentLabel, normalizeDepartment } from '../app/access';
import { errorMessage } from '../features/common/errorMessage';
import { amountError, Intent, nextIntent, parseAmount, shiftBlocksOpening, unitLabel } from '../features/inventory/openItem';

interface OpenItemFormProps {
  /** Canonical department whose catalog is offered. */
  department: Department;
  onItemAdded?: (receipt: WriteReceipt) => void;
  disabled?: boolean;
}

const formatExpiry = (ms: number) =>
  new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);

/**
 * Open an inventory batch. Name, unit and expiry come from the catalog on the server; the form
 * sends only product, fridge, amount and the opening instant. Success is shown only for a
 * receipt; a failed send keeps the same operation ID so a retry cannot create a duplicate.
 */
const OpenItemForm: React.FC<OpenItemFormProps> = ({ department, onItemAdded, disabled = false }) => {
  const { businessId, role, isOnShift, isOffline } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [fridgeId, setFridgeId] = useState('');
  const [amountRaw, setAmountRaw] = useState('1');
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ severity: 'success' | 'info'; text: string } | null>(null);
  const intent = useRef<Intent | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([getBusinessProducts(businessId), getBusinessFridges(businessId)])
      .then(([productList, fridgeList]) => {
        if (cancelled) return;
        setProducts(productList.filter(p => normalizeDepartment(p.area) === department));
        setFridges(fridgeList.filter(f => normalizeDepartment(f.department) === department));
      })
      .catch(err => {
        console.error('Error loading catalog:', err);
        if (!cancelled) setLoadError(errorMessage(err, 'טעינת רשימת המוצרים נכשלה.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, department]);

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);
  const unit = product?.type === 'kg' ? 'kg' : 'units';
  const blockedByShift = shiftBlocksOpening(role, !!isOnShift);
  const blockedReason = blockedByShift ? 'יש להתחיל משמרת כדי לפתוח פריטים.' : null;
  const formDisabled = disabled || submitting || !!blockedReason;

  const selectProduct = (id: string) => {
    const next = products.find(p => p.id === id);
    setProductId(id);
    setAmountRaw('1');
    setAmountInvalid(false);
    setFridgeId(next?.fridgeId && fridges.some(f => f.id === next.fridgeId) ? next.fridgeId : '');
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formDisabled) return;
    setError(null);
    setNotice(null);
    if (!product?.id) {
      setError('יש לבחור מוצר');
      return;
    }
    const amount = parseAmount(amountRaw, unit);
    if (amount === null) {
      setAmountInvalid(true);
      setError(amountError(unit));
      return;
    }

    const current = nextIntent(
      intent.current,
      JSON.stringify([product.id, fridgeId, amount, department]),
      () => Date.now(),
      () => crypto.randomUUID(),
    );
    intent.current = current;

    setSubmitting(true);
    try {
      const receipt = await openInventoryItem({
        operationId: current.operationId,
        productId: product.id,
        amount,
        fridgeId: fridgeId || undefined,
        openedAtMs: current.openedAtMs,
      });
      intent.current = null;
      const expiry = formatExpiry(current.openedAtMs + product.shelfLifeDays * 24 * 60 * 60 * 1000);
      setNotice(
        receipt.state === 'synced'
          ? { severity: 'success', text: `"${product.name}" נפתח. תוקף עד ${expiry}.` }
          : { severity: 'info', text: `"${product.name}" נשמר במכשיר וממתין לשליחה לשרת. הוא עדיין לא נשמר בשרת.` },
      );
      setProductId('');
      setFridgeId('');
      setAmountRaw('1');
      onItemAdded?.(receipt);
    } catch (err) {
      console.error('Error opening item:', err);
      const code = (err as { code?: unknown } | null)?.code;
      setError(
        code === 'unavailable'
          ? 'השליחה לא הושלמה והפריט לא נשמר. נסה שוב — ניסיון חוזר לא ייצור פריט כפול.'
          : errorMessage(err, 'פתיחת הפריט נכשלה. הפריט לא נשמר.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate aria-label="פתיחת פריט" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        פתיחת פריט — {departmentLabel(department)}
      </Typography>

      {isOffline && !blockedReason && (
        <Alert severity="info" sx={{ mb: 2 }}>
          אין חיבור. הפריט יישמר במכשיר וישלח לשרת כשהחיבור יחזור.
        </Alert>
      )}
      {blockedReason && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {blockedReason}
        </Alert>
      )}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }} role="status">
          {notice.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth disabled={formDisabled || loading}>
          <InputLabel id="product-select-label">מוצר</InputLabel>
          <Select
            labelId="product-select-label"
            value={productId}
            label="מוצר"
            onChange={e => selectProduct(e.target.value)}
          >
            {products.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({unitLabel(p.type)}, {p.shelfLifeDays} ימים)
              </MenuItem>
            ))}
          </Select>
          {!loading && !loadError && products.length === 0 && (
            <FormHelperText error>אין מוצרים בקטלוג של מחלקת {departmentLabel(department)}</FormHelperText>
          )}
        </FormControl>

        <FormControl fullWidth disabled={formDisabled || loading || fridges.length === 0}>
          <InputLabel id="fridge-select-label">מקרר (אופציונלי)</InputLabel>
          <Select
            labelId="fridge-select-label"
            value={fridgeId}
            label="מקרר (אופציונלי)"
            onChange={e => {
              setFridgeId(e.target.value);
              setNotice(null);
            }}
          >
            <MenuItem value="">ללא מקרר</MenuItem>
            {fridges.map(f => (
              <MenuItem key={f.id} value={f.id ?? ''}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label={`כמות (${unitLabel(product?.type)})`}
          value={amountRaw}
          onChange={e => {
            setAmountRaw(e.target.value);
            setAmountInvalid(false);
            setNotice(null);
          }}
          error={amountInvalid}
          helperText={amountInvalid ? amountError(unit) : unit === 'kg' ? 'אפשר משקל עשרוני, למשל 0.5' : undefined}
          disabled={formDisabled || !product}
          inputProps={{ inputMode: unit === 'kg' ? 'decimal' : 'numeric', dir: 'ltr', 'aria-label': 'כמות' }}
          InputProps={{ endAdornment: <InputAdornment position="end">{unitLabel(product?.type)}</InputAdornment> }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={formDisabled || !product} size="large">
          {submitting ? 'שולח...' : 'פתח פריט'}
        </Button>
      </Box>
    </Box>
  );
};

export default OpenItemForm;
