import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { WifiOff as OfflineIcon, Wifi as OnlineIcon } from '@mui/icons-material';
import { tokens } from '../app/theme';

/**
 * Browser connectivity only (navigator.onLine). Queue state (pending/failed) is shown
 * separately by SyncStatus from the C3 OfflineProvider; this banner never claims anything synced.
 */
export const OfflineIndicator: React.FC = () => {
  const [, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMessage(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      setShowOnlineMessage(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Indicator */}
      {/* V1: below dialogs (it covered the dialog close button and the app bar on phones), dismissible and
          time-limited; the offline state stays visible in the inventory list and inside the forms. */}
      <Snackbar
        open={showOfflineMessage}
        autoHideDuration={8000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setShowOfflineMessage(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: theme => theme.zIndex.modal - 1 }}
      >
        <Alert
          onClose={() => setShowOfflineMessage(false)}
          closeText="סגירת ההודעה"
          severity="warning"
          icon={<OfflineIcon />}
          sx={{
            backgroundColor: tokens.colors.warningTint,
            color: tokens.colors.text.primary,
            border: `1px solid ${tokens.colors.warning}`,
            borderRadius: tokens.radius,
            '& .MuiAlert-icon': {
              color: tokens.colors.warning
            }
          }}
        >
          <strong>אין חיבור לאינטרנט</strong> • פתיחה וסגירה של פריטים נשמרות במכשיר ונשלחות כשהחיבור חוזר. שינויים אחרים דורשים חיבור.
        </Alert>
      </Snackbar>

      {/* Back Online Indicator */}
      <Snackbar
        open={showOnlineMessage}
        autoHideDuration={3000}
        onClose={() => setShowOnlineMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: theme => theme.zIndex.modal - 1 }}
      >
        <Alert
          onClose={() => setShowOnlineMessage(false)}
          closeText="סגירת ההודעה"
          severity="success"
          icon={<OnlineIcon />}
          sx={{
            backgroundColor: tokens.colors.successTint,
            color: tokens.colors.text.primary,
            border: `1px solid ${tokens.colors.success}`,
            borderRadius: tokens.radius,
            '& .MuiAlert-icon': {
              color: tokens.colors.success
            }
          }}
        >
          <strong>החיבור חזר</strong>
        </Alert>
      </Snackbar>
    </>
  );
};
