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
  /**
   * Optional, presentation-only (UI2-R1): reports while an opening request is unresolved so the
   * surrounding dialog can refuse dismissal and keep this form, its values and its intent mounted.
   */
  onBusyChange?: (busy: boolean) => void;
}

const formatExpiry = (ms: number) =>
  new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms);

/**
 * Open an inventory batch. Name, unit and expiry come from the catalog on the server; the form
 * sends only product, fridge, amount and the opening instant. Success is shown only for a
 * receipt; a failed send keeps the same operation ID so a retry cannot create a duplicate.
 */
const OpenItemForm: React.FC<OpenItemFormProps> = ({ department, onItemAdded, disabled = false, onBusyChange }) => {
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
    onBusyChange?.(submitting);
  }, [submitting, onBusyChange]);
  // Never leave a wrapper locked if the form unmounts.
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const amountRef = useRef<HTMLInputElement>(null);

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
      // Shown once, on the field itself (helper text), and focused so a phone user sees it with the keyboard up.
      setAmountInvalid(true);
      amountRef.current?.focus();
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

  // The heading is owned by the surrounding dialog ("פתיחת פריט — <מחלקה>"); the form keeps an accessible name.
  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={`פתיחת פריט — ${departmentLabel(department)}`}
      sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
        {isOffline && !blockedReason && (
          <Alert severity="info">אין חיבור. הפריט יישמר במכשיר וישלח לשרת כשהחיבור יחזור.</Alert>
        )}
        {blockedReason && <Alert severity="warning">{blockedReason}</Alert>}
        {loadError && <Alert severity="error">{loadError}</Alert>}

        <FormControl fullWidth disabled={formDisabled || loading}>
          <InputLabel id="product-select-label">מוצר</InputLabel>
          <Select
            labelId="product-select-label"
            value={productId}
            label="מוצר"
            onChange={e => selectProduct(e.target.value)}
            sx={{ minHeight: 48 }}
          >
            {products.map(p => (
              <MenuItem key={p.id} value={p.id} sx={{ minHeight: 48, whiteSpace: 'normal' }}>
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
            sx={{ minHeight: 48 }}
          >
            <MenuItem value="" sx={{ minHeight: 48 }}>ללא מקרר</MenuItem>
            {fridges.map(f => (
              <MenuItem key={f.id} value={f.id ?? ''} sx={{ minHeight: 48 }}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="כמות"
          value={amountRaw}
          inputRef={amountRef}
          onChange={e => {
            setAmountRaw(e.target.value);
            setAmountInvalid(false);
            setNotice(null);
          }}
          error={amountInvalid}
          helperText={
            amountInvalid ? amountError(unit) : !product ? 'בחר מוצר כדי להזין כמות' : unit === 'kg' ? 'אפשר משקל עשרוני, למשל 0.5' : 'מספר שלם של יחידות'
          }
          disabled={formDisabled || !product}
          inputProps={{
            inputMode: unit === 'kg' ? 'decimal' : 'numeric',
            dir: 'ltr',
            'aria-label': 'כמות',
            'aria-invalid': amountInvalid,
            enterKeyHint: 'done',
          }}
          InputProps={{
            sx: { minHeight: 48 },
            endAdornment: product ? <InputAdornment position="end">{unitLabel(product.type)}</InputAdornment> : undefined,
          }}
        />
      </Box>

      {/* Sticky action footer: the submit button and the result stay reachable with the keyboard open. */}
      <Box
        data-testid="open-item-footer"
        sx={{
          position: 'sticky',
          bottom: 0,
          mt: 'auto',
          pt: 1.5,
          pb: 'max(8px, env(safe-area-inset-bottom))',
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1,
        }}
      >
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity={notice.severity} role="status">
            {notice.text}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth disabled={formDisabled || !product} sx={{ minHeight: 48, fontSize: '1rem' }}>
          {submitting ? 'שולח...' : 'פתח פריט'}
        </Button>
      </Box>
    </Box>
  );
};

export default OpenItemForm;
