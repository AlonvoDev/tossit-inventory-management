import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { SyncOperation } from '../domain/contracts';
import { inventoryController, startOfflineLifecycle } from './runtime';
interface OfflineState { operations: SyncOperation[]; pendingCount: number; failedCount: number; error: string | null; retry: (operationId: string) => Promise<void> }
const OfflineContext = createContext<OfflineState | undefined>(undefined);
export function OfflineProvider({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => inventoryController.subscribe(setOperations), []);
  useEffect(() => {
    setError(null);
    return startOfflineLifecycle(loading ? null : userProfile, failure => setError(failure instanceof Error ? failure.message : 'Offline storage is unavailable'));
  }, [loading, userProfile]);
  return <OfflineContext.Provider value={{ operations, pendingCount: operations.filter(op => op.state === 'pending').length, failedCount: operations.filter(op => op.state === 'failed').length, error, retry: inventoryController.retry }}>{children}</OfflineContext.Provider>;
}
export function useOffline(): OfflineState {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline requires OfflineProvider inside AuthProvider');
  return context;
}
