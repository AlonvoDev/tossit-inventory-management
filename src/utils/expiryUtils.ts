import { Timestamp } from 'firebase/firestore';

// Type definitions
export interface ExpiryConfig {
  productId: string;
  name: string;
  shelfLifeDays: number;
  area: 'bar' | 'kitchen';
}

// Calculate expiry time based on the opening time and shelf life in days
export const calculateExpiryTime = (
  openingTime: Timestamp,
  shelfLifeDays: number
): Timestamp => {
  return new Timestamp(
    openingTime.seconds + shelfLifeDays * 24 * 60 * 60,
    openingTime.nanoseconds
  );
};

// Check if an item is expired
export const isItemExpired = (expiryTime: Timestamp): boolean => {
  const now = Timestamp.now();
  return expiryTime.toMillis() < now.toMillis();
};

// Calculate days until expiry (shown as hours for better user experience)
export const hoursUntilExpiry = (expiryTime: Timestamp): number => {
  const now = Timestamp.now();
  const diffMs = expiryTime.toMillis() - now.toMillis();
  return Math.max(0, diffMs / (60 * 60 * 1000));
};

// Format expiry time for display
export const formatExpiryTime = (expiryTime: Timestamp): string => {
  const date = expiryTime.toDate();
  return date.toLocaleString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get expiry status text and color
export const getExpiryStatus = (
  expiryTime: Timestamp
): { text: string; color: string } => {
  const hours = hoursUntilExpiry(expiryTime);
  
  if (hours === 0) {
    return { text: 'Expired', color: 'red' };
  }
  
  if (hours <= 24) {
    return { text: 'Expiring soon', color: 'orange' };
  }
  
  if (hours <= 72) { // 3 days
    return { text: 'Expiring soon', color: 'yellow' };
  }
  
  return { text: 'Valid', color: 'green' };
}; 