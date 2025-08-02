import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Check if notifications are supported by the browser
 * @returns Boolean indicating if notifications are supported
 */
export const isNotificationsSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check the current notification permission status
 * @returns The current notification permission status
 */
export const checkNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationsSupported()) {
    return 'unsupported';
  }
  
  return Notification.permission;
};

/**
 * Request notification permission from the user
 * @returns The updated notification permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationsSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  return await Notification.requestPermission();
};

/**
 * Register the service worker and subscribe to push notifications
 * @returns The push subscription if successful
 */
export const registerServiceWorker = async (): Promise<PushSubscription | null> => {
  if (!isNotificationsSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }
  
  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered with scope:', registration.scope);
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Get the subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      return subscription;
    }
    
    // Create a new subscription
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
      )
    });
    
    return newSubscription;
  } catch (error) {
    console.error('Error registering service worker or subscribing to push:', error);
    return null;
  }
};

/**
 * Send the push subscription to the server
 * @param userId - The user ID
 * @param businessId - The business ID
 * @param subscription - The push subscription
 */
export const saveSubscription = async (
  userId: string,
  businessId: string,
  subscription: PushSubscription
): Promise<void> => {
  try {
    const db = getFirestore();
    const subscriptionDoc = doc(db, 'pushSubscriptions', userId);
    
    await setDoc(subscriptionDoc, {
      userId,
      businessId,
      subscription: JSON.stringify(subscription),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      platform: 'web'
    }, { merge: true });
    
    console.log('Push subscription saved to database');
  } catch (error) {
    console.error('Error saving push subscription:', error);
  }
};

/**
 * Display a local notification
 * @param title - The notification title
 * @param options - The notification options
 */
export const showLocalNotification = (
  title: string,
  options: NotificationOptions = {}
): void => {
  if (!isNotificationsSupported() || Notification.permission !== 'granted') {
    console.log('Notifications not supported or permission denied');
    return;
  }
  
  try {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

/**
 * Convert a base64 string to Uint8Array for applicationServerKey
 * @param base64String - The base64 string to convert
 * @returns The converted Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Send a browser notification
export const sendNotification = (
  title: string,
  options: NotificationOptions = {}
): Notification | null => {
  if (!isNotificationsSupported() || Notification.permission !== 'granted') {
    console.warn('Cannot send notification: not supported or permission not granted');
    return null;
  }
  
  try {
    return new Notification(title, {
      icon: '/icon-192.png',
      ...options,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// Send a notification for an expired item
export const sendExpiredItemNotification = (
  productName: string, 
  area: string,
  openingTime: string
): Notification | null => {
  return sendNotification('Item Expired!', {
    body: `${productName} in ${area} (opened at ${openingTime}) has expired and needs to be thrown away.`,
    tag: `expired-${productName}-${Date.now()}`,
    requireInteraction: true
  });
};

// Send a notification for multiple expired items
export const sendMultipleExpiredItemsNotification = (
  count: number,
  businessName?: string
) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`פריטים פגי תוקף - ${count} פריטים`, {
      body: `יש ${count} פריטים שפג תוקפם${businessName ? ` ב-${businessName}` : ''}`,
      icon: '/icon-192.png',
      tag: 'multiple-expired-items',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 20000);

    return notification;
  }
  return null;
};

// Send a daily summary notification to admin
export const sendDailySummaryNotification = (
  count: number
): Notification | null => {
  return sendNotification('Daily Expiry Summary', {
    body: `There ${count === 1 ? 'is' : 'are'} ${count} expired item${count === 1 ? '' : 's'} that need${count === 1 ? 's' : ''} attention.`,
    tag: 'daily-summary',
    requireInteraction: true
  });
};

// Send a notification for auto-disconnecting shift
export const sendShiftEndingNotification = (): Notification | null => {
  return sendNotification('Shift Ending Soon', {
    body: 'Your shift will automatically end at midnight. Please complete any pending tasks.',
    tag: 'shift-ending',
    requireInteraction: false
  });
};

// Send a notification for shift ended
export const sendShiftEndedNotification = (): Notification | null => {
  return sendNotification('Shift Ended', {
    body: 'Your shift has been automatically ended by the system.',
    tag: 'shift-ended',
    requireInteraction: false
  });
};

// Setup notification click event handlers
export const setupNotificationClickHandlers = (
  // swRegistration: ServiceWorkerRegistration
): void => {
  // Handle notification click events
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { action, notification } = event.data;
    
    if (!action || !notification) return;
    
    console.log('Notification action clicked:', action, notification);
    
    // Handle different actions here
    switch (action) {
      case 'view':
        // Navigate to the item
        window.open('/dashboard', '_blank');
        break;
      case 'mark-thrown':
        // Mark item as thrown
        // This would call your API
        console.log('Marking item as thrown:', notification);
        break;
      case 'view-all':
        // Navigate to the expired items list
        window.open('/dashboard', '_blank');
        break;
      case 'view-admin':
        // Navigate to the admin panel
        window.open('/admin', '_blank');
        break;
      default:
        // Default action - open the app
        window.open('/', '_blank');
    }
  });
}; 

// Discard reminder notifications
export const sendDiscardReminderNotification = (productName: string, area: string, expiryTime: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`תזכורת השלכה - ${productName}`, {
      body: `${productName} במחלקת ${area === 'bar' ? 'הבר' : 'המטבח'} פג תוקף ב-${expiryTime} ויש לזרוק אותו`,
      icon: '/icon-192.png',
      tag: `discard-reminder-${productName}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 30 seconds
    setTimeout(() => {
      notification.close();
    }, 30000);
  }
};

// Admin notification for unattended expired items
export const sendAdminExpiredItemsNotification = (count: number, businessName?: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`התראת מנהל - פריטים לא נזרקו`, {
      body: `${count} פריטים שפג תוקפם לא נזרקו מאתמול. נדרשת בדיקה${businessName ? ` ב-${businessName}` : ''}`,
      icon: '/icon-192.png',
      tag: 'admin-expired-items',
      requireInteraction: true,
      badge: '/icon-192.png'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      // Navigate to expired items view
      window.location.href = '/admin?tab=expired';
    };

    // Auto close after 60 seconds
    setTimeout(() => {
      notification.close();
    }, 60000);
  }
};

// Send multiple discard reminders for evening check (23:00)
export const sendEveningDiscardReminders = (expiredItems: Array<{
  productName: string;
  area: string;
  expiryTime: string;
}>) => {
  if (expiredItems.length === 0) return;
  
  if (expiredItems.length === 1) {
    sendDiscardReminderNotification(
      expiredItems[0].productName,
      expiredItems[0].area,
      expiredItems[0].expiryTime
    );
  } else {
    // Send summary notification for multiple items
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`תזכורת השלכה - ${expiredItems.length} פריטים`, {
        body: `יש ${expiredItems.length} פריטים שפג תוקפם ויש לזרוק אותם`,
        icon: '/icon-192.png',
        tag: 'evening-discard-reminders',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to expired items view
        window.location.href = '/dashboard?tab=expired';
      };

      setTimeout(() => {
        notification.close();
      }, 45000);
    }
  }
}; 

export const sendSingleExpiredItemNotification = (productName: string, area: string, expiryTime: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`פריט פג תוקף - ${productName}`, {
      body: `${productName} במחלקת ${area === 'bar' ? 'הבר' : 'המטבח'} פג תוקף ב-${expiryTime}`,
      icon: '/icon-192.png',
      tag: `expired-item-${productName}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 30000);
  }
}; 