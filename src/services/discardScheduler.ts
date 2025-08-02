import { Timestamp } from 'firebase/firestore';
import { getExpiredNotDiscardedItems } from '../api/firestoreAPI';
import { sendEveningDiscardReminders, sendAdminExpiredItemsNotification } from '../utils/notificationUtils';
import { formatExpiryTime } from '../utils/expiryUtils';

// Track scheduler state
let schedulerActive = false;
let schedulerInterval: NodeJS.Timeout | null = null;

// Start the discard scheduler
export const startDiscardScheduler = (businessId: string) => {
  if (schedulerActive || !businessId) return;
  
  console.log('Starting discard scheduler for business:', businessId);
  schedulerActive = true;
  
  // Check every minute for timing
  schedulerInterval = setInterval(async () => {
    await checkDiscardSchedule(businessId);
  }, 60000); // Check every minute
  
  // Also run an immediate check
  checkDiscardSchedule(businessId);
};

// Stop the discard scheduler
export const stopDiscardScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerActive = false;
  console.log('Discard scheduler stopped');
};

// Main scheduler check function
const checkDiscardSchedule = async (businessId: string) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  try {
    // Evening reminder at 23:00 (11 PM)
    if (currentHour === 23 && currentMinute === 0) {
      await sendEveningReminders(businessId);
    }
    
    // Morning admin notification at 08:00 (8 AM)
    if (currentHour === 8 && currentMinute === 0) {
      await sendMorningAdminNotification(businessId);
    }
    
    // Additional check at 22:00 (10 PM) for items expiring today
    if (currentHour === 22 && currentMinute === 0) {
      await sendPreEveningCheck(businessId);
    }
    
  } catch (error) {
    console.error('Error in discard scheduler:', error);
  }
};

// Send evening reminders for expired items
const sendEveningReminders = async (businessId: string) => {
  try {
    const expiredItems = await getExpiredNotDiscardedItems(businessId);
    
    if (expiredItems.length > 0) {
      console.log(`Found ${expiredItems.length} expired items for evening reminder`);
      
      const reminderData = expiredItems.map(item => ({
        productName: item.productName,
        area: item.area,
        expiryTime: formatExpiryTime(item.expiryTime)
      }));
      
      sendEveningDiscardReminders(reminderData);
    }
  } catch (error) {
    console.error('Error sending evening reminders:', error);
  }
};

// Send morning admin notification for unattended items
const sendMorningAdminNotification = async (businessId: string) => {
  try {
    const expiredItems = await getExpiredNotDiscardedItems(businessId);
    
    // Filter for items that expired yesterday or earlier
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999); // End of yesterday
    
    const oldExpiredItems = expiredItems.filter(item => 
      item.expiryTime.toMillis() < yesterday.getTime()
    );
    
    if (oldExpiredItems.length > 0) {
      console.log(`Found ${oldExpiredItems.length} unattended expired items for admin notification`);
      sendAdminExpiredItemsNotification(oldExpiredItems.length);
    }
  } catch (error) {
    console.error('Error sending morning admin notification:', error);
  }
};

// Pre-evening check for items expiring today
const sendPreEveningCheck = async (businessId: string) => {
  try {
    const now = Timestamp.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
    
    const expiredItems = await getExpiredNotDiscardedItems(businessId);
    
    // Filter for items that will expire by end of today
    const expiringSoonItems = expiredItems.filter(item => 
      item.expiryTime.toMillis() >= now.toMillis() && 
      item.expiryTime.toMillis() <= endOfDayTimestamp.toMillis()
    );
    
    if (expiringSoonItems.length > 0) {
      console.log(`Found ${expiringSoonItems.length} items expiring today for pre-evening check`);
      
      const reminderData = expiringSoonItems.map(item => ({
        productName: item.productName,
        area: item.area,
        expiryTime: formatExpiryTime(item.expiryTime)
      }));
      
      sendEveningDiscardReminders(reminderData);
    }
  } catch (error) {
    console.error('Error in pre-evening check:', error);
  }
};

// Get scheduler status
export const getSchedulerStatus = () => ({
  active: schedulerActive,
  hasInterval: schedulerInterval !== null
});

// Force run scheduler checks (for testing)
export const forceRunSchedulerChecks = (businessId: string) => {
  console.log('Force running scheduler checks...');
  checkDiscardSchedule(businessId);
}; 