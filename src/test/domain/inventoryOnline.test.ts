import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeInventoryItem, openInventoryItem, subscribeSyncOperations } from '../../api/inventoryOperations';
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', async importOriginal => importOriginal<typeof import('firebase/firestore')>());
afterEach(() => vi.unstubAllGlobals());
describe('online inventory contract before durable queue integration', () => {
  it('rejects offline writes without pretending to have queued or synced them', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(openInventoryItem({ operationId: 'offline-test-1', productId: 'milk', amount: 0.5, openedAtMs: Date.now() })).rejects.toMatchObject({ code: 'unavailable' });
    await expect(closeInventoryItem({ operationId: 'offline-test-2', itemId: 'batch', action: 'finished' })).rejects.toMatchObject({ code: 'unavailable' });
  });
  it('exposes an empty queue rather than invented pending operations', () => {
    const listener = vi.fn();
    const stop = subscribeSyncOperations(listener);
    expect(listener).toHaveBeenCalledWith([]);
    stop();
  });
});
