import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
} from '@mui/material';
import { CloudUpload as PendingIcon, ErrorOutline as FailedIcon } from '@mui/icons-material';
import { useOffline } from '../offline/OfflineProvider';
import { errorMessage } from '../features/common/errorMessage';

/**
 * Durable inventory queue state (Codex C3), shown separately from connectivity:
 * pending = saved on this device, not yet acknowledged by the server;
 * failed = rejected by the server and retained until reviewed/retried. Never called "synced".
 */
export const SyncStatus: React.FC<{ itemNames?: Record<string, string> }> = ({ itemNames = {} }) => {
  const { operations, pendingCount, failedCount, error, retry } = useOffline();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const visible = useMemo(() => operations.filter(op => op.state !== 'synced'), [operations]);

  if (!pendingCount && !failedCount && !error) return null;

  const handleRetry = async (operationId: string) => {
    setRetrying(operationId);
    setRetryError(null);
    try {
      await retry(operationId);
    } catch (err) {
      setRetryError(errorMessage(err, 'הניסיון החוזר נכשל. הפעולה נשמרה וניתן לנסות שוב.'));
    } finally {
      setRetrying(null);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        {pendingCount > 0 && (
          <Chip
            size="small"
            color="info"
            icon={<PendingIcon />}
            label={`${pendingCount} ממתינות לשליחה`}
            onClick={() => setOpen(true)}
            sx={{ fontWeight: 600 }}
          />
        )}
        {failedCount > 0 && (
          <Chip
            size="small"
            color="error"
            icon={<FailedIcon />}
            label={`${failedCount} נכשלו`}
            onClick={() => setOpen(true)}
            sx={{ fontWeight: 600 }}
          />
        )}
        {error && !pendingCount && !failedCount && (
          <Chip size="small" color="warning" label="שמירה במכשיר לא זמינה" onClick={() => setOpen(true)} />
        )}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>פעולות שעדיין לא נשמרו בשרת</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              השמירה במכשיר אינה זמינה כרגע. פעולות חדשות במצב לא מקוון עלולות להיכשל.
            </Alert>
          )}
          {retryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {retryError}
            </Alert>
          )}
          {visible.length === 0 ? (
            <Box sx={{ py: 2 }}>אין פעולות ממתינות.</Box>
          ) : (
            <List dense>
              {visible.map(op => (
                <ListItem
                  key={op.operationId}
                  divider
                  secondaryAction={
                    op.state === 'failed' ? (
                      <Button size="small" onClick={() => handleRetry(op.operationId)} disabled={retrying !== null}>
                        {retrying === op.operationId ? 'מנסה...' : 'נסה שוב'}
                      </Button>
                    ) : undefined
                  }
                >
                  <ListItemText
                    primary={itemNames[op.itemId] ?? 'פעולת מלאי'}
                    secondary={
                      op.state === 'pending'
                        ? 'נשמר במכשיר, ממתין לשליחה'
                        : `נכשל: ${errorMessage({ code: op.errorCode }, 'השרת דחה את הפעולה.')}`
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          {failedCount > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              פעולות שנכשלו נשמרות לבדיקה ואינן נשלחות שוב אוטומטית. "נסה שוב" שולח את אותה פעולה בדיוק.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>סגור</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
