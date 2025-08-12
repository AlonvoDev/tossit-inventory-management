import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  productId: string;  // Human-readable product ID (e.g. P001)
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  businessId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  category?: string;  // Product category (meat, sauces, alcohol, etc.)
  shelfLifeDays: number;
  type: 'kg' | 'units';
  area: 'bar' | 'kitchen' | '';
  fridgeId?: string;  // Reference to Fridge document
}

// Product categories
export const PRODUCT_CATEGORIES = [
  'בשר',
  'רטבים ותיבול', 
  'אלכוהול',
  'חלב',
  'ירקות ופירות'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// Product category interface for custom categories
export interface CustomProductCategory {
  id: string;
  name: string;
  businessId: string;
  createdAt?: Timestamp;
  createdBy?: string;
} 