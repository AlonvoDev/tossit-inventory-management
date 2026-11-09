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
      <Snackbar
        open={showOfflineMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 2000 }}
      >
        <Alert
          severity="warning"
          icon={<OfflineIcon />}
          sx={{
            backgroundColor: tokens.colors.warning,
            color: '#fff',
            borderRadius: tokens.radius,
            '& .MuiAlert-icon': {
              color: '#fff'
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
        sx={{ zIndex: 2000 }}
      >
        <Alert
          onClose={() => setShowOnlineMessage(false)}
          severity="success"
          icon={<OnlineIcon />}
          sx={{
            backgroundColor: tokens.colors.success,
            color: '#fff',
            borderRadius: tokens.radius,
            '& .MuiAlert-icon': {
              color: '#fff'
            }
          }}
        >
          <strong>החיבור חזר</strong>
        </Alert>
      </Snackbar>
    </>
  );
};
