import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { startShift, endShift } from '../api/authAPI';

// Types
interface ShiftContextType {
  isOnShift: boolean;
  shiftStartedAt: Timestamp | null;
  startUserShift: () => Promise<void>;
  endUserShift: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Create the context with default values
const ShiftContext = createContext<ShiftContextType>({
  isOnShift: false,
  shiftStartedAt: null,
  startUserShift: async () => {},
  endUserShift: async () => {},
  isLoading: false,
  error: null,
});

// Hook for using the shift context
export const useShift = () => useContext(ShiftContext);

// Shift provider component
export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isOnShift: authIsOnShift, shiftStartedAt: authShiftStartedAt } = useAuth();
  const [isOnShift, setIsOnShift] = useState(authIsOnShift);
  const [shiftStartedAt, setShiftStartedAt] = useState<Timestamp | null>(authShiftStartedAt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when auth context changes
  useEffect(() => {
    setIsOnShift(authIsOnShift);
    setShiftStartedAt(authShiftStartedAt);
  }, [authIsOnShift, authShiftStartedAt]);

  // Start user shift
  const startUserShift = async (): Promise<void> => {
    if (!currentUser) {
      setError('You must be logged in to start a shift');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await startShift(currentUser.uid);
      setIsOnShift(true);
      setShiftStartedAt(Timestamp.now());
    } catch (error) {
      console.error('Error starting shift:', error);
      setError('Failed to start shift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // End user shift
  const endUserShift = async (): Promise<void> => {
    if (!currentUser) {
      setError('You must be logged in to end a shift');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await endShift(currentUser.uid);
      setIsOnShift(false);
      setShiftStartedAt(null);
    } catch (error) {
      console.error('Error ending shift:', error);
      setError('Failed to end shift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isOnShift,
    shiftStartedAt,
    startUserShift,
    endUserShift,
    isLoading,
    error,
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
}; 