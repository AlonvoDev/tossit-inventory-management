import { Timestamp } from 'firebase/firestore';

// Common types for error handling
export interface ApiError {
  code: string;
  message: string;
}

export interface FirebaseError extends Error {
  code: string;
  message: string;
}

// Form validation types
export interface ValidationErrors {
  [key: string]: string;
}

// Async operation states
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// Firestore document with metadata
export interface FirestoreDocument {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// User roles and permissions
export type UserRole = 'admin' | 'manager' | 'staff';
export type Department = 'bar' | 'kitchen';

// Item states
export type ItemStatus = 'active' | 'finished' | 'discarded' | 'expired';

// Quantity types
export interface Quantity {
  amount: number;
  unit: 'kg' | 'units' | 'liters' | 'pieces';
}

// Safe event handlers
export type SafeEventHandler<T = unknown> = (data: T) => void | Promise<void>;
