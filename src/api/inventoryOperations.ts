import { inventoryController } from '../offline/runtime';
export const openInventoryItem = inventoryController.open;
export const closeInventoryItem = inventoryController.close;
export const subscribeSyncOperations = inventoryController.subscribe;
export const retrySyncOperation = inventoryController.retry;
