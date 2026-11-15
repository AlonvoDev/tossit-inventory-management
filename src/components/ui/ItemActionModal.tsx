import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { Button, Input } from './index';
import { tokens } from '../../app/theme';
import type { DiscardReason, ItemUnit } from '../../domain/contracts';
import { CloseDraft, DISCARD_REASONS, validateClose } from '../../features/inventory/closeItem';
import { unitLabel } from '../../features/inventory/openItem';

export interface ItemActionConfirm {
  action: 'finished' | 'discarded';
  discardedAmount?: number;
  reason?: DiscardReason;
}

export interface ItemActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (input: ItemActionConfirm) => void;
  itemName: string;
  itemAmount: number;
  itemType: ItemUnit;
  loading?: boolean;
  /** Error from the last attempt; the dialog stays open so the same intent can be retried. */
  error?: string | null;
  /** The batch was closed by another action: nothing more can be done here. */
  closedElsewhere?: boolean;
}

const emptyDraft: CloseDraft = { action: 'finished', amountRaw: '', reason: '' };

export const ItemActionModal: React.FC<ItemActionModalProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemAmount,
  itemType,
  loading = false,
  error,
  closedElsewhere = false,
}) => {
  const [draft, setDraft] = useState<CloseDraft>(emptyDraft);
  const [fieldError, setFieldError] = useState<{ field: 'amount' | 'reason'; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft({ ...emptyDraft, amountRaw: String(itemAmount) });
      setFieldError(null);
    }
  }, [open, itemAmount]);

  const update = (patch: Partial<CloseDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setFieldError(null);
  };

  const handleConfirm = () => {
    if (loading || closedElsewhere) return;
    const result = validateClose(draft, itemType, itemAmount);
    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message });
      return;
    }
    onConfirm({ action: draft.action, discardedAmount: result.discardedAmount, reason: result.reason });
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ paddingBottom: tokens.spacing.md }}>
        <Typography component="span" variant="h2" sx={{ color: tokens.colors.text.primary, display: 'block' }}>
          עדכון מצב פריט
        </Typography>
        <Typography component="span" variant="body2" sx={{ color: tokens.colors.text.muted, marginTop: tokens.spacing.sm, display: 'block' }}>
          {itemName} ({itemAmount} {unitLabel(itemType)})
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ paddingY: tokens.spacing.lg }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          {closedElsewhere ? (
            <Alert severity="warning">הפריט כבר סומן כנגמר או כנזרק על ידי פעולה אחרת. הרשימה מתעדכנת.</Alert>
          ) : (
            <>
              <RadioGroup
                value={draft.action}
                onChange={e => update({ action: e.target.value as CloseDraft['action'] })}
                aria-label="פעולה"
              >
                <FormControlLabel
                  value="finished"
                  control={<Radio />}
                  disabled={loading}
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>נגמר</Typography>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>
                        המוצר נוצל במלואו, ללא פסולת
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="discarded"
                  control={<Radio />}
                  disabled={loading}
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>נזרק</Typography>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>
                        חלק מהמוצר או כולו נזרק לפח
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>

              {draft.action === 'discarded' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
                  <Input
                    label={`כמות שנזרקה (${unitLabel(itemType)})`}
                    value={draft.amountRaw}
                    onChange={e => update({ amountRaw: e.target.value })}
                    disabled={loading}
                    error={fieldError?.field === 'amount'}
                    helperText={fieldError?.field === 'amount' ? fieldError.message : `עד ${itemAmount} ${unitLabel(itemType)}`}
                    inputProps={{ inputMode: itemType === 'kg' ? 'decimal' : 'numeric', dir: 'ltr', 'aria-label': 'כמות שנזרקה' }}
                  />
                  <FormControl error={fieldError?.field === 'reason'} disabled={loading}>
                    <FormLabel id="discard-reason-label">סיבת זריקה</FormLabel>
                    <RadioGroup
                      row
                      aria-labelledby="discard-reason-label"
                      value={draft.reason}
                      onChange={e => update({ reason: e.target.value as DiscardReason })}
                    >
                      {DISCARD_REASONS.map(r => (
                        <FormControlLabel key={r.value} value={r.value} control={<Radio />} label={r.label} />
                      ))}
                    </RadioGroup>
                    {fieldError?.field === 'reason' && <FormHelperText>{fieldError.message}</FormHelperText>}
                  </FormControl>
                </Box>
              )}

              <Alert severity="info" sx={{ borderRadius: tokens.radius }}>
                הפריט ייסגר במלואו. {draft.action === 'discarded' ? 'הכמות שנזרקה תירשם כפסולת בדוח.' : ''}
              </Alert>
            </>
          )}

          {error && !closedElsewhere && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          {closedElsewhere ? 'סגור' : 'ביטול'}
        </Button>
        {!closedElsewhere && (
          <Button onClick={handleConfirm} variant="contained" disabled={loading} loading={loading}>
            {loading ? 'שולח...' : draft.action === 'finished' ? 'סמן כנגמר' : 'סמן כנזרק'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
