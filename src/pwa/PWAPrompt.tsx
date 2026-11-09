import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Alert, Snackbar } from '@mui/material';
import { Refresh as UpdateIcon } from '@mui/icons-material';
import { Button } from '../components/ui/Button';
import { tokens } from '../app/theme';
import { applyUpdate, isUpdateAvailable, subscribeUpdate } from './updateStore';

/**
 * Controlled app updates: a new worker waits until the user chooses to reload.
 * "Later" hides the dialog; a banner keeps the update reachable until it is applied.
 * Updating reloads the page; it does not clear app data (the worker only replaces its own caches).
 */
export const PWAPrompt: React.FC = () => {
  const [available, setAvailable] = useState(isUpdateAvailable());
  const [dialogOpen, setDialogOpen] = useState(isUpdateAvailable());
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(
    () =>
      subscribeUpdate(next => {
        setAvailable(next);
        if (next) setDialogOpen(true);
      }),
    [],
  );

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setError(null);
    try {
      await applyUpdate();
    } catch (err) {
      console.error('Applying update failed:', err);
      setError('העדכון נכשל. נסה שוב או סגור ופתח את האפליקציה.');
      setUpdating(false);
    }
  };

  return (
    <>
      <Dialog open={available && dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UpdateIcon sx={{ color: tokens.colors.primary }} />
          גרסה חדשה זמינה
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            גרסה חדשה של TossIt מוכנה. העדכון ירענן את האפליקציה.
          </Typography>
          <Alert severity="info" sx={{ borderRadius: tokens.radius }}>
            אם אתה באמצע מילוי טופס, סיים אותו קודם ועדכן אחר כך.
          </Alert>
          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: tokens.radius }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={updating}>
            מאוחר יותר
          </Button>
          <Button onClick={handleUpdate} variant="contained" startIcon={<UpdateIcon />} disabled={updating}>
            {updating ? 'מעדכן...' : 'עדכן עכשיו'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={available && !dialogOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          sx={{ borderRadius: tokens.radius }}
          action={
            <Button size="small" variant="text" onClick={() => setDialogOpen(true)}>
              עדכן
            </Button>
          }
        >
          גרסה חדשה זמינה
        </Alert>
      </Snackbar>

      <Snackbar
        open={installed}
        autoHideDuration={4000}
        onClose={() => setInstalled(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setInstalled(false)} severity="success" sx={{ borderRadius: tokens.radius }}>
          TossIt הותקן. אפשר לפתוח אותו מהמסך הראשי.
        </Alert>
      </Snackbar>
    </>
  );
};
