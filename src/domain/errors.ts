export type InventoryErrorCode = 'unauthenticated' | 'permission-denied' | 'invalid-input' | 'not-on-shift' | 'not-found' | 'already-closed' | 'catalog-changed' | 'unavailable';
export class InventoryError extends Error {
  constructor(public readonly code: InventoryErrorCode, message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}
export function invalid(message: string): never { throw new InventoryError('invalid-input', message); }
