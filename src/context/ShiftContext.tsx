import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { startShift, endShift } from '../api/authAPI';

interface ShiftContextType {
  isOnShift: boolean;
  shiftStartedAt: Timestamp | null;
  startUserShift: () => Promise<void>;
  endUserShift: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}
const ShiftContext = createContext<ShiftContextType | undefined>(undefined);
export function useShift() {
  const value = useContext(ShiftContext);
  if (!value) throw new Error('useShift must be used within a ShiftProvider');
  return value;
}
interface Operation { id: number; uid: string | null; pending: boolean; error: string | null }
export function ShiftProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated, isOnShift, shiftStartedAt } = useAuth();
  const [operation, setOperation] = useState<Operation>({ id: 0, uid: null, pending: false, error: null });
  const sequence = useRef(0);
  const uid = currentUser?.uid ?? null;
  const isCurrent = operation.uid === uid;
  async function changeShift(start: boolean) {
    const id = ++sequence.current;
    if (!uid || !isAuthenticated) {
      setOperation({ id, uid, pending: false, error: 'יש להתחבר עם פרופיל עובד פעיל' });
      return;
    }
    setOperation({ id, uid, pending: true, error: null });
    try {
      await (start ? startShift(uid) : endShift(uid));
      setOperation(current => current.id === id ? { ...current, pending: false } : current);
    } catch {
      setOperation(current => current.id === id ? { ...current, pending: false, error: 'עדכון המשמרת נכשל. נסה שוב.' } : current);
    }
  }
  return <ShiftContext.Provider value={{
    // Authority comes only from the profile snapshot; no second optimistic copy.
    isOnShift, shiftStartedAt,
    startUserShift: () => changeShift(true), endUserShift: () => changeShift(false),
    isLoading: isCurrent && operation.pending,
    error: isCurrent ? operation.error : null,
  }}>{children}</ShiftContext.Provider>;
}
