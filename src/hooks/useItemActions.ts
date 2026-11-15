import { useCallback, useRef, useState } from 'react';
import { closeInventoryItem } from '../api/inventoryOperations';
import type { DiscardReason, WriteReceipt } from '../domain/contracts';
import { errorMessage } from '../features/common/errorMessage';

export interface CloseRequest {
  itemId: string;
  action: 'finished' | 'discarded';
  discardedAmount?: number;
  reason?: DiscardReason;
}

/**
 * Finished/discarded actions through C2 `closeInventoryItem`.
 * One operation ID per intent (item + action + amount + reason), reused on retry so a lost
 * acknowledgement cannot close twice; actor identity comes from the server, never the UI.
 * Resolves with the receipt only after acknowledgement; otherwise sets `error` and resolves null.
 */
export const useCloseItem = () => {
  const intent = useRef<{ key: string; operationId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const busy = useRef(false);

  const reset = useCallback(() => {
    intent.current = null;
    setError(null);
    setAlreadyClosed(false);
  }, []);

  const submit = useCallback(async (request: CloseRequest): Promise<WriteReceipt | null> => {
    if (busy.current) return null; // repeated click while sending
    const key = JSON.stringify([request.itemId, request.action, request.discardedAmount ?? null, request.reason ?? null]);
    if (!intent.current || intent.current.key !== key) {
      intent.current = { key, operationId: crypto.randomUUID() };
    }
    busy.current = true;
    setSubmitting(true);
    setError(null);
    setAlreadyClosed(false);
    try {
      const receipt = await closeInventoryItem({ operationId: intent.current.operationId, ...request });
      intent.current = null;
      return receipt;
    } catch (err) {
      console.error('Error closing item:', err);
      const code = (err as { code?: unknown } | null)?.code;
      if (code === 'already-closed') setAlreadyClosed(true);
      setError(
        code === 'unavailable'
          ? 'השליחה לא הושלמה והפריט לא עודכן. נסה שוב — ניסיון חוזר לא יבצע את הפעולה פעמיים.'
          : errorMessage(err, 'עדכון הפריט נכשל. הפריט לא עודכן.'),
      );
      return null;
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error, alreadyClosed, reset };
};
