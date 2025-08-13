import { useState, useCallback } from 'react';
import { markItemAsFinished, markItemAsDiscarded } from '../api/firestoreAPI';
import { useAuth } from './useAuth';

export interface ItemActionsResult {
  isModalOpen: boolean;
  loading: boolean;
  error: string | null;
  openModal: () => void;
  closeModal: () => void;
  handleItemAction: (action: 'finished' | 'discarded', quantity?: number, reason?: string) => Promise<void>;
}

export const useItemActions = (itemId: string, onSuccess?: () => void): ItemActionsResult => {
  const { user, userProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setError(null);
  }, []);

  const handleItemAction = useCallback(async (
    action: 'finished' | 'discarded',
    quantity?: number,
    reason?: string
  ) => {
    if (!user || !userProfile) {
      setError('משתמש לא מחובר');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (action === 'finished') {
        await markItemAsFinished(itemId, user.uid, userProfile.fullName || user.email || 'משתמש');
      } else if (action === 'discarded') {
        if (!quantity || quantity <= 0) {
          throw new Error('כמות נדרשת עבור פסולת');
        }

        // Determine discard reason
        let discardReason: 'expired' | 'damaged' | 'other' = 'other';
        if (reason) {
          if (reason.includes('פג') || reason.includes('תוקף')) {
            discardReason = 'expired';
          } else if (reason.includes('נפגם') || reason.includes('פגום')) {
            discardReason = 'damaged';
          }
        }

        await markItemAsDiscarded(
          itemId,
          user.uid,
          userProfile.fullName || user.email || 'משתמש',
          quantity,
          discardReason
        );
      }

      setIsModalOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון הפריט');
    } finally {
      setLoading(false);
    }
  }, [itemId, user, userProfile, onSuccess]);

  return {
    isModalOpen,
    loading,
    error,
    openModal,
    closeModal,
    handleItemAction,
  };
};
