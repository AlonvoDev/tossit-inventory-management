import { Timestamp } from 'firebase/firestore';

/**
 * Fridge (location) record stored in Firestore.
 *
 * Each business can have multiple fridges/locations. Products
 * and inventory items will be associated with a specific fridge via
 * the fridgeId field. The department field is kept for filtering
 * ("bar" vs "kitchen").
 */
export interface Fridge {
  /**
   * Document ID (assigned by Firestore). Optional when creating a new
   * fridge. Should be filled in when reading from Firestore.
   */
  id?: string;
  /** Human‑readable name of the fridge/location (e.g. "Bar 1"). */
  name: string;
  /**
   * Department that owns this fridge. Must be either "bar" or
   * "kitchen". Used for filtering and permissions.
   */
  department: 'bar' | 'kitchen';
  /**
   * Business identifier for multi‑tenant support. Each fridge belongs
   * to exactly one business (the current user’s businessId).
   */
  businessId: string;
  /** Creation timestamp. Added automatically when writing to Firestore. */
  createdAt?: Timestamp;
  /** Last update timestamp. Optional; set when updating a record. */
  updatedAt?: Timestamp;
}