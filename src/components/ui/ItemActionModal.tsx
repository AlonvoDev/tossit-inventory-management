import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Alert,
} from '@mui/material';
import { Button, Input } from './index';
import { tokens } from '../../app/theme';

export interface ItemActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (action: 'finished' | 'discarded', quantity?: number, reason?: string) => void;
  itemName: string;
  itemAmount: number;
  itemType: 'kg' | 'units';
  loading?: boolean;
}

export const ItemActionModal: React.FC<ItemActionModalProps> = ({
  open,
  onClose,
  onConfirm,
  itemName,
  itemAmount,
  itemType,
  loading = false,
}) => {
  const [action, setAction] = useState<'finished' | 'discarded'>('finished');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const handleActionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newAction = event.target.value as 'finished' | 'discarded';
    setAction(newAction);
    
    // Reset quantity when switching to finished (not required)
    if (newAction === 'finished') {
      setQuantity('');
      setReason('');
    }
  }, []);

  const handleQuantityChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(event.target.value);
  }, []);

  const handleReasonChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setReason(event.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    const numQuantity = quantity ? parseFloat(quantity) : undefined;
    onConfirm(action, numQuantity, reason || undefined);
  }, [action, quantity, reason, onConfirm]);

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
      // Reset form
      setAction('finished');
      setQuantity('');
      setReason('');
    }
  }, [loading, onClose]);

  const isValid = action === 'finished' || (action === 'discarded' && quantity && parseFloat(quantity) > 0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: tokens.spacing.md }}>
        <Typography variant="h2" sx={{ color: tokens.colors.text.primary }}>
          עדכון מצב פריט
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.muted, marginTop: tokens.spacing.sm }}>
          {itemName} ({itemAmount} {itemType === 'kg' ? 'ק"ג' : 'יחידות'})
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ paddingY: tokens.spacing.lg }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          <RadioGroup value={action} onChange={handleActionChange}>
            <FormControlLabel
              value="finished"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ✅ נגמר (נוצל עד התום)
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>
                    המוצר נוצל במלואו ללא פסולת
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="discarded"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    🗑️ נזרק לפח
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.text.muted }}>
                    חלק מהמוצר או כולו נזרק לפח
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {action === 'discarded' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              <Alert severity="warning" sx={{ borderRadius: tokens.radius }}>
                <Typography variant="body2">
                  עבור פסולת נדרשת כמות ספציפית למעקב מדויק
                </Typography>
              </Alert>

              <Input
                label={`כמות שנזרקה (${itemType === 'kg' ? 'ק"ג' : 'יחידות'})`}
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                placeholder={`הזן כמות עד ${itemAmount}`}
                inputProps={{
                  min: 0.1,
                  max: itemAmount,
                  step: itemType === 'kg' ? 0.1 : 1,
                }}
                helperText={`מקסימום: ${itemAmount} ${itemType === 'kg' ? 'ק"ג' : 'יחידות'}`}
                required
              />

              <Input
                label="סיבת זריקה (אופציונלי)"
                value={reason}
                onChange={handleReasonChange}
                placeholder="למשל: פג תוקף, נפגם, וכו'"
                multiline
                rows={2}
              />
            </Box>
          )}

          {action === 'finished' && (
            <Alert severity="success" sx={{ borderRadius: tokens.radius }}>
              <Typography variant="body2">
                מצוין! המוצר נוצל במלואו ללא פסולת 🎉
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          disabled={loading}
        >
          ביטול
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!isValid || loading}
          loading={loading}
        >
          {action === 'finished' ? 'סמן כנגמר' : 'סמן כנזרק'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
