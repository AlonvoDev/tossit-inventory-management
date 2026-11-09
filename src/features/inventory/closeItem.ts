import type { DiscardReason, ItemUnit } from '../../domain/contracts';
import { parseAmount } from './openItem';

/**
 * Close-action rules (U2). The whole batch is closed either way; for "discarded" the amount
 * records the waste portion and cannot exceed the batch (C2 contract).
 */
export interface CloseDraft {
  action: 'finished' | 'discarded';
  amountRaw: string;
  reason: DiscardReason | '';
}

export type CloseValidation =
  | { ok: true; discardedAmount?: number; reason?: DiscardReason }
  | { ok: false; field: 'amount' | 'reason'; message: string };

export const DISCARD_REASONS: { value: DiscardReason; label: string }[] = [
  { value: 'expired', label: 'פג תוקף' },
  { value: 'damaged', label: 'נפגם' },
  { value: 'other', label: 'אחר' },
];

export const validateClose = (draft: CloseDraft, unit: ItemUnit, batchAmount: number): CloseValidation => {
  if (draft.action === 'finished') return { ok: true };
  const amount = parseAmount(draft.amountRaw, unit);
  if (amount === null) {
    return { ok: false, field: 'amount', message: unit === 'kg' ? 'יש להזין משקל חיובי בק"ג' : 'יש להזין מספר שלם של יחידות' };
  }
  if (amount > batchAmount) return { ok: false, field: 'amount', message: `הכמות לא יכולה לעלות על ${batchAmount}` };
  if (!draft.reason) return { ok: false, field: 'reason', message: 'יש לבחור סיבת זריקה' };
  return { ok: true, discardedAmount: amount, reason: draft.reason };
};
