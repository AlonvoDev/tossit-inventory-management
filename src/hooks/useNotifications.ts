import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  checkNotificationPermission, 
  requestNotificationPermission,
  registerServiceWorker
} from '../utils/notificationUtils';
import { 
  setupPeriodicChecks, 
  clearPeriodicChecks 
} from '../api/expirationChecker';

/**
 * Hook for managing notifications in the TossIt application
 * @param checkInterval - How often to check for notifications (in milliseconds)
 * @returns Object with notification state and methods
 */
export const useNotifications = (checkInterval = 60000) => {
  const { currentUser, businessId } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Check if notifications are supported and get current permission status
  useEffect(() => {
    const checkSupport = async () => {
      const status = await checkNotificationPermission();
      setPermissionStatus(status);
    };

    checkSupport();
  }, []);

  // Register service worker and setup periodic checks when user is authenticated
  useEffect(() => {
    if (!currentUser || !businessId || permissionStatus !== 'granted') {
      return;
    }

    const setupNotifications = async () => {
      try {
        // Register service worker
        const subscription = await registerServiceWorker();
        setIsSubscribed(!!subscription);

        // Setup periodic checks for expired items and shift management
        if (businessId) {
          const id = setupPeriodicChecks(businessId, currentUser.uid, checkInterval);
          setIntervalId(id);
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    // Clean up function
    return () => {
      if (intervalId) {
        clearPeriodicChecks(intervalId);
        setIntervalId(null);
      }
    };
  }, [currentUser, businessId, permissionStatus, checkInterval]);

  // Request permission function
  const requestPermission = async (): Promise<boolean> => {
    try {
      const newStatus = await requestNotificationPermission();
      setPermissionStatus(newStatus);
      return newStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  return {
    permissionStatus,
    isSubscribed,
    requestPermission,
    isSupported: permissionStatus !== 'unsupported'
  };
};

export default useNotifications; 