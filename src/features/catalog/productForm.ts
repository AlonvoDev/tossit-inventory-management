import type { Department } from '../../app/access';

/**
 * Product form rules (U3c). Presentation-side checks that match the C1b product rules:
 * name required, area 'bar' | 'kitchen', type 'kg' | 'units', shelfLifeDays a positive integer.
 */
export interface ProductFormValues {
  name: string;
  shelfLifeDays: string; // raw input; parsed on validation
  type: 'kg' | 'units' | '';
  area: Department | '';
  category: string;
  fridgeId: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export const MAX_SHELF_LIFE_DAYS = 3650;

/** Positive whole days only: "1.5", "0", "-2", "", "1e2" are rejected (no silent truncation). */
export const parseShelfLifeDays = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n >= 1 && n <= MAX_SHELF_LIFE_DAYS ? n : null;
};

export const validateProductForm = (
  values: ProductFormValues,
  allowedDepartments: Department[],
): ProductFormErrors => {
  const errors: ProductFormErrors = {};
  if (!values.name.trim()) errors.name = 'יש להזין שם מוצר';
  if (parseShelfLifeDays(values.shelfLifeDays) === null) {
    errors.shelfLifeDays = `יש להזין מספר שלם של ימים (1–${MAX_SHELF_LIFE_DAYS})`;
  }
  if (values.type !== 'kg' && values.type !== 'units') errors.type = 'יש לבחור סוג מדידה';
  if (!values.area) errors.area = 'יש לבחור מחלקה';
  else if (!allowedDepartments.includes(values.area)) errors.area = 'אין לך הרשאה לנהל את המחלקה הזו';
  return errors;
};

/** Human-readable product code (P001...). Display only; Firestore document IDs identify products. */
export const nextProductCode = (products: { productId?: string }[]): string => {
  const numbers = products
    .map(p => /^P(\d+)$/.exec(p.productId || '')?.[1])
    .filter((n): n is string => !!n)
    .map(n => parseInt(n, 10));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `P${next.toString().padStart(3, '0')}`;
};
