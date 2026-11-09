import type { Timestamp } from 'firebase/firestore';

export type Department = 'bar' | 'kitchen';
export type ItemUnit = 'kg' | 'units';
export type DiscardReason = 'expired' | 'damaged' | 'other';
export type SyncState = 'pending' | 'synced' | 'failed';
export interface OpenInventoryItemInput {
  operationId: string;
  productId: string;
  amount: number;
  fridgeId?: string;
  openedAtMs: number;
}
export interface CloseInventoryItemInput {
  operationId: string;
  itemId: string;
  action: 'finished' | 'discarded';
  discardedAmount?: number;
  reason?: DiscardReason;
}
export interface WriteReceipt { operationId: string; itemId: string; state: 'pending' | 'synced' }
export interface SyncOperation { operationId: string; itemId: string; state: SyncState; errorCode?: string }
export interface BusinessSettings {
  timezone: 'Asia/Jerusalem';
  eveningRemindersEnabled: boolean;
  morningSummaryEnabled: boolean;
  autoEndShiftsAtMidnight: boolean;
}
export interface PushPayload { version: 1; title: string; body: string; url: string; tag: string }
export interface InventoryItem {
  id?: string;
  productId?: string; // Absent only on legacy items; never inferred from a display code.
  productName: string;
  type: ItemUnit;
  amount: number;
  openingTime: Timestamp;
  expiryTime: Timestamp;
  userId: string;
  businessId: string;
  area: Department;
  fridgeId?: string;
  isThrown: boolean;
  discarded: boolean;
  finished: boolean;
  discardedAt?: Timestamp;
  discardedBy?: string;
  discardedByName?: string;
  discardedQuantity?: number;
  discardReason?: DiscardReason;
  finishedAt?: Timestamp;
  finishedBy?: string;
  finishedByName?: string;
  closedOperationId?: string;
  reminderSent?: boolean;
  adminNotified?: boolean;
}
