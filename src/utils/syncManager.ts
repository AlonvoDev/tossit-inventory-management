import { inventoryController, quarantineLegacyStorage } from '../offline/runtime';
/** Compatibility facade: no legacy operation is deleted or blindly replayed. */
export async function processPendingOperations(): Promise<void> {
  await quarantineLegacyStorage();
  await inventoryController.replay();
}
export function setupSyncManager(): () => void {
  const replay = () => { void processPendingOperations().catch(() => undefined); };
  window.addEventListener('online', replay);
  return () => window.removeEventListener('online', replay);
}
/** Historical name retained; source records are preserved for explicit review. */
export function clearPendingOperations(): void { void quarantineLegacyStorage().catch(() => undefined); }
