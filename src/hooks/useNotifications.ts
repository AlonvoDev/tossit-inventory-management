import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkNotificationPermission, disablePushNotifications, enablePushNotifications, getPushNotificationState, syncPushNotificationsSession, type PushNotificationState } from '../utils/notificationUtils';
/** Reads existing state on mount; browser opt-in is only an explicit button action. */
export function useNotifications(checkInterval = 60000) {
  void checkInterval; // Compatibility only: server scheduling replaces page polling.
  const { uid, businessId } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [status, setStatus] = useState<PushNotificationState>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const codeOf = (failure: unknown) => failure && typeof failure === 'object' && 'code' in failure && typeof failure.code === 'string' ? failure.code : 'unknown';
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setPermissionStatus(await checkNotificationPermission());
    const current = await getPushNotificationState(); setStatus(current); return current;
  }, []);
  useEffect(() => {
    let disposed = false;
    const read = async () => {
      try {
        await syncPushNotificationsSession(uid, businessId ?? undefined);
        const permission = await checkNotificationPermission(); const current = await getPushNotificationState();
        if (!disposed) { setPermissionStatus(permission); setStatus(current); setError(null); setErrorCode(null); }
      } catch (failure) { if (!disposed) { setError(failure instanceof Error ? failure.message : 'Notification status unavailable'); setErrorCode(codeOf(failure)); } }
    };
    void read(); window.addEventListener('online', read);
    return () => { disposed = true; window.removeEventListener('online', read); };
  }, [uid, businessId]);
  const enable = async () => {
    setBusy(true); setError(null); setErrorCode(null);
    try { const result = await enablePushNotifications(); await refresh(); return result; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Notification setup failed'); setErrorCode(codeOf(failure)); throw failure; }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true); setError(null); setErrorCode(null);
    try { await disablePushNotifications(); await refresh(); }
    catch (failure) { setStatus('pending-disable'); setErrorCode(codeOf(failure)); setError(failure instanceof Error ? failure.message : 'Device cleanup pending'); throw failure; }
    finally { setBusy(false); }
  };
  return { permissionStatus, status, isSubscribed: status === 'enabled', isSupported: permissionStatus !== 'unsupported', busy, error, errorCode, refresh, enable, disable,
    requestPermission: async () => (await enable()) === 'enabled' };
}
export default useNotifications;
