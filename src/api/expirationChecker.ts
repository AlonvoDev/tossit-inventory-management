import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Item } from './firestoreAPI';
import { 
  sendExpiredItemNotification, 
  sendMultipleExpiredItemsNotification,
  sendDailySummaryNotification,
  sendShiftEndingNotification,
  sendShiftEndedNotification
} from '../utils/notificationUtils';
import { formatExpiryTime } from '../utils/expiryUtils';
import { endShift } from './authAPI';

/**
 * Check for expired items that haven't been thrown away
 * @param businessId - The business ID to check items for
 * @returns The expired items
 */
export const checkExpiredItems = async (businessId: string): Promise<Item[]> => {
  try {
    // Create a query to get all non-thrown items for the business
    const q = query(
      collection(db, 'items'),
      where('businessId', '==', businessId),
      where('isThrown', '==', false)
    );
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    
    // Get the current time
    const now = Timestamp.now();
    
    // Filter for expired items (client-side since Firestore can't do inequality on multiple fields)
    return querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Item))
      .filter(item => item.expiryTime.toMillis() < now.toMillis());
  } catch (error) {
    console.error('Error checking expired items:', error);
    return [];
  }
};

/**
 * Send notifications for expired items based on time of day
 * This should be called periodically to check for items that need notifications
 * @param businessId - The business ID to check items for
 * @param userId - Optional user ID to filter notifications for
 */
export const sendExpiredItemsNotifications = async (
  businessId: string,
  userId?: string
): Promise<void> => {
  try {
    // Get expired items
    const expiredItems = await checkExpiredItems(businessId);
    
    if (expiredItems.length === 0) {
      return;
    }
    
    // Get current hour (in 24h format)
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    // Filter items for the specific user if provided
    const filteredItems = userId 
      ? expiredItems.filter(item => item.userId === userId)
      : expiredItems;
    
    if (filteredItems.length === 0) {
      return;
    }
    
    // Evening notifications: every 20 minutes from 23:00 if items are expired
    if (currentHour === 23 && currentMinute % 20 === 0) {
      if (filteredItems.length > 3) {
        // If there are many items, send a summary notification
        sendMultipleExpiredItemsNotification(filteredItems.length);
      } else {
        // Send individual notifications for each item
        filteredItems.forEach(item => {
          sendExpiredItemNotification(
            item.productName,
            item.area,
            formatExpiryTime(item.openingTime)
          );
        });
      }
    }
    
    // Morning summary for admins at 08:00
    if (currentHour === 8 && currentMinute === 0) {
      // This would typically be filtered for admin users only
      sendDailySummaryNotification(expiredItems.length);
    }
  } catch (error) {
    console.error('Error sending expired items notifications:', error);
  }
};

/**
 * Check for users on shift and either notify or auto-end shifts at midnight
 * @param businessId - The business ID to check users for
 * @param autoEndShifts - Whether to automatically end shifts or just send notifications
 */
export const manageShiftsAtMidnight = async (
  businessId: string,
  autoEndShifts: boolean = true
): Promise<void> => {
  try {
    // Get current hour and minute
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    // Send warnings at 23:30
    if (currentHour === 23 && currentMinute === 30) {
      await sendShiftEndingWarnings(businessId);
    }
    
    // Auto-end shifts at midnight (00:00)
    if (currentHour === 0 && currentMinute === 0 && autoEndShifts) {
      await endAllActiveShifts(businessId);
    }
  } catch (error) {
    console.error('Error managing shifts at midnight:', error);
  }
};

/**
 * Send warnings to users who are still on shift at 23:30
 * @param businessId - The business ID to check users for
 */
const sendShiftEndingWarnings = async (businessId: string): Promise<void> => {
  try {
    // Query for all users on shift
    const q = query(
      collection(db, 'users'),
      where('businessId', '==', businessId),
      where('isOnShift', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Send notifications to each user
    querySnapshot.docs.forEach(() => {
      // In a real app, we would send these to the user's device
      // For now, we'll just call the notification function
      sendShiftEndingNotification();
    });
  } catch (error) {
    console.error('Error sending shift ending warnings:', error);
  }
};

/**
 * End all active shifts at midnight
 * @param businessId - The business ID to end shifts for
 */
const endAllActiveShifts = async (businessId: string): Promise<void> => {
  try {
    // Query for all users on shift
    const q = query(
      collection(db, 'users'),
      where('businessId', '==', businessId),
      where('isOnShift', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // End each user's shift
    const promises = querySnapshot.docs.map(async (doc) => {
      const userId = doc.id;
      
      // End the shift
      await endShift(userId);
      
      // Send notification
      sendShiftEndedNotification();
    });
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error ending all active shifts:', error);
  }
};

/**
 * Setup periodic checks for expired items and shift management
 * This should be called when the application starts
 * @param businessId - The business ID to check for
 * @param userId - Optional user ID to filter notifications for
 * @param checkInterval - How often to check (in milliseconds), defaults to 60 seconds
 */
export const setupPeriodicChecks = (
  businessId: string,
  userId?: string,
  checkInterval: number = 60000
): NodeJS.Timeout => {
  return setInterval(() => {
    // Check for expired items and send notifications
    sendExpiredItemsNotifications(businessId, userId);
    
    // Check for shifts that need to be ended at midnight
    manageShiftsAtMidnight(businessId);
  }, checkInterval);
};

/**
 * Clear the periodic checks interval
 * @param intervalId - The interval ID to clear
 */
export const clearPeriodicChecks = (intervalId: NodeJS.Timeout): void => {
  clearInterval(intervalId);
};

// Helper function to check if it's time to run a specific task
export const isTimeToRun = (hour: number, minute: number): boolean => {
  const now = new Date();
  return now.getHours() === hour && now.getMinutes() === minute;
}; 