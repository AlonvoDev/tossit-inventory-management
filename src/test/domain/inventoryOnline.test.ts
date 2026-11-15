import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeInventoryItem, openInventoryItem, subscribeSyncOperations } from '../../api/inventoryOperations';
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', async importOriginal => importOriginal<typeof import('firebase/firestore')>());
afterEach(() => vi.unstubAllGlobals());
describe('inventory boundary without a cached authorized session', () => {
  it('rejects signed-out offline writes without creating pending receipts', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(openInventoryItem({ operationId: 'offline-test-1', productId: 'milk', amount: 0.5, openedAtMs: Date.now() })).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(closeInventoryItem({ operationId: 'offline-test-2', itemId: 'batch', action: 'finished' })).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('exposes no other account operations while signed out', () => {
    const listener = vi.fn();
    const stop = subscribeSyncOperations(listener);
    expect(listener).toHaveBeenCalledWith([]);
    stop();
  });
});
