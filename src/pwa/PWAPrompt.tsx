import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Refresh as UpdateIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Button } from '../components/ui/Button';
import { tokens } from '../app/theme';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [, setUpdateAvailable] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed install prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setInstallDismissed(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show install prompt after a delay if not dismissed
      if (!dismissed) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000); // Show after 3 seconds
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setShowSuccessSnackbar(true);
    };

    // Listen for service worker updates from vite-plugin-pwa
    const handleServiceWorkerUpdate = () => {
      setUpdateAvailable(true);
      setShowUpdatePrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-update-available', handleServiceWorkerUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-update-available', handleServiceWorkerUpdate);
    };
  }, [installDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleInstallDismiss = () => {
    setShowInstallPrompt(false);
    setInstallDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleUpdateClick = () => {
    window.location.reload();
  };

  const handleUpdateDismiss = () => {
    setShowUpdatePrompt(false);
  };

  return (
    <>
      {/* Install Prompt Dialog */}
      <Dialog 
        open={showInstallPrompt && !installDismissed} 
        onClose={handleInstallDismiss}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InstallIcon sx={{ color: tokens.colors.primary }} />
          <Typography variant="h3" sx={{ flex: 1 }}>
            התקן את TossIt
          </Typography>
          <IconButton onClick={handleInstallDismiss} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1">
              התקן את TossIt במכשיר שלך לחוויית שימוש מהירה ונוחה יותר!
            </Typography>
            
            <Box sx={{ 
              background: tokens.colors.surface,
              padding: tokens.spacing.md,
              borderRadius: tokens.radius,
              border: `1px solid #e0e0e0`
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 1 }}>
                יתרונות ההתקנה:
              </Typography>
              <ul style={{ margin: 0, paddingRight: '20px' }}>
                <li>גישה מהירה מהמסך הראשי</li>
                <li>עבודה במצב לא מקוון</li>
                <li>הודעות push על פריטים שפוגי תוקף</li>
                <li>ביצועים מהירים יותר</li>
              </ul>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
          <Button
            onClick={handleInstallDismiss}
            variant="outlined"
          >
            אולי מאוחר יותר
          </Button>
          <Button
            onClick={handleInstallClick}
            variant="contained"
            startIcon={<InstallIcon />}
          >
            התקן עכשיו
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Prompt Dialog */}
      <Dialog 
        open={showUpdatePrompt} 
        onClose={handleUpdateDismiss}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UpdateIcon sx={{ color: tokens.colors.primary }} />
          <Typography variant="h3" sx={{ flex: 1 }}>
            עדכון זמין
          </Typography>
          <IconButton onClick={handleUpdateDismiss} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ marginBottom: 2 }}>
            גרסה חדשה של TossIt זמינה עם תכונות ושיפורים חדשים!
          </Typography>
          <Alert severity="info" sx={{ borderRadius: tokens.radius }}>
            רענון האפליקציה יטען את הגרסה החדשה עם כל התכונות המעודכנות.
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
          <Button
            onClick={handleUpdateDismiss}
            variant="outlined"
          >
            מאוחר יותר
          </Button>
          <Button
            onClick={handleUpdateClick}
            variant="contained"
            startIcon={<UpdateIcon />}
          >
            רענן עכשיו
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccessSnackbar(false)} 
          severity="success"
          sx={{ borderRadius: tokens.radius }}
        >
          🎉 TossIt הותקן בהצלחה! תוכל לגשת אליו מהמסך הראשי.
        </Alert>
      </Snackbar>
    </>
  );
};
