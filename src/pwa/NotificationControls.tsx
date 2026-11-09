import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
  type PushNotificationState,
} from '../utils/notificationUtils';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../features/common/errorMessage';
import { needsHomeScreenInstall, pushConfigured } from './pushEnv';

type ViewState = PushNotificationState | 'loading' | 'not-configured' | 'error';

const ROLE_COPY: Record<string, string> = {
  staff: 'תזכורות בערב (23:00, 23:20, 23:40) על פריטים שפג תוקפם במחלקה שלך, כשאתה במשמרת.',
  manager: 'סיכום בוקר (08:00) של פריטים שפג תוקפם ולא טופלו במחלקה שלך.',
  admin: 'סיכום בוקר (08:00) של פריטים שפג תוקפם ולא טופלו בעסק.',
};

/**
 * Per-device push opt-in (C4). Never asks for permission on load: the browser prompt appears
 * only inside the "enable" click. "Enabled" is shown only after the server confirms the device.
 */
export const NotificationControls: React.FC = () => {
  const { role } = useAuth();
  const configured = pushConfigured();
  const [state, setState] = useState<ViewState>(configured ? 'loading' : 'not-configured');
  const [busy, setBusy] = useState<'enable' | 'disable' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    if (!configured) return;
    setState('loading');
    setError(null);
    try {
      setState(await getPushNotificationState());
    } catch (err) {
      console.error('Reading notification state failed:', err);
      setState('error');
      setError(errorMessage(err, 'לא ניתן לבדוק את מצב ההתראות כרגע.'));
    }
  }, [configured]);

  useEffect(() => {
    void read();
  }, [read]);

  // Must run directly from the click so the browser accepts the permission prompt.
  const enable = async () => {
    setBusy('enable');
    setError(null);
    try {
      const result = await enablePushNotifications();
      setState(result === 'enabled' ? 'enabled' : result);
    } catch (err) {
      console.error('Enabling notifications failed:', err);
      setError(errorMessage(err, 'הפעלת ההתראות לא הושלמה. ההתראות לא הופעלו.'));
      // Re-read the truthful state (e.g. a partial registration is still "disabled").
      try {
        setState(await getPushNotificationState());
      } catch {
        setState('error');
      }
    } finally {
      setBusy(null);
    }
  };

  const disable = async () => {
    setBusy('disable');
    setError(null);
    try {
      await disablePushNotifications();
      setState(await getPushNotificationState());
    } catch (err) {
      console.error('Disabling notifications failed:', err);
      setState('pending-disable');
      setError(errorMessage(err, 'הכיבוי לא הושלם. הוא יושלם אוטומטית כשהחיבור יחזור, או נסה שוב.'));
    } finally {
      setBusy(null);
    }
  };

  const what = ROLE_COPY[role ?? 'staff'] ?? ROLE_COPY.staff;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="body2" color="text.secondary">
        {what} ההתראות נשלחות רק אם מנהל העסק הפעיל אותן, ורק למכשירים שבהם הופעלו כאן.
      </Typography>

      {state === 'loading' && (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography>בודק את מצב ההתראות...</Typography>
        </Box>
      )}

      {state === 'not-configured' && (
        <Alert severity="info">התראות עדיין אינן זמינות באפליקציה. הן יופעלו לאחר הגדרת שירות ההתראות.</Alert>
      )}

      {state === 'unsupported' &&
        (needsHomeScreenInstall() ? (
          <Alert severity="info">
            באייפון אפשר לקבל התראות רק מהאפליקציה המותקנת: בספארי לחץ "שיתוף" ← "הוסף למסך הבית", פתח את TossIt
            מהמסך הראשי והפעל כאן.
          </Alert>
        ) : (
          <Alert severity="info">הדפדפן במכשיר הזה אינו תומך בהתראות.</Alert>
        ))}

      {state === 'denied' && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={read}>
              בדוק שוב
            </Button>
          }
        >
          ההתראות חסומות בהגדרות הדפדפן. כדי להפעיל, אפשר התראות עבור TossIt בהגדרות הדפדפן או המכשיר, ואז לחץ
          "בדוק שוב".
        </Alert>
      )}

      {state === 'enabled' && <Alert severity="success">ההתראות מופעלות במכשיר הזה.</Alert>}

      {state === 'pending-disable' && (
        <Alert severity="warning">כיבוי ההתראות במכשיר הזה עדיין לא הושלם בשרת. ייתכן שיגיעו התראות עד שיושלם.</Alert>
      )}

      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {state === 'disabled' && (
          <Button variant="contained" onClick={enable} disabled={busy !== null}>
            {busy === 'enable' ? 'מפעיל...' : 'הפעל התראות במכשיר הזה'}
          </Button>
        )}
        {state === 'enabled' && (
          <Button variant="outlined" color="error" onClick={disable} disabled={busy !== null}>
            {busy === 'disable' ? 'מכבה...' : 'כבה התראות במכשיר הזה'}
          </Button>
        )}
        {state === 'pending-disable' && (
          <Button variant="outlined" onClick={disable} disabled={busy !== null}>
            {busy === 'disable' ? 'מכבה...' : 'נסה לכבות שוב'}
          </Button>
        )}
        {state === 'error' && (
          <Button variant="outlined" onClick={read} disabled={busy !== null}>
            נסה שוב
          </Button>
        )}
      </Box>
    </Box>
  );
};
