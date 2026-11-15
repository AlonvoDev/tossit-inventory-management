import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { OfflineProvider, useOffline } from '../../offline/OfflineProvider';
import { offlineStore, rememberProfile } from '../../offline/storage';
import * as storage from '../../offline/storage';
const state = vi.hoisted(() => ({ uid: 'staff' as string | null, authCallback: undefined as undefined | ((user: { uid: string } | null) => void), profileNext: undefined as undefined | ((snapshot: { exists(): boolean; data(): Record<string, unknown>; metadata: { fromCache: boolean } }) => void), profileError: undefined as undefined | (() => void) }));
vi.mock('../../services/firebase', () => ({ db: {}, auth: { get currentUser() { return state.uid ? { uid: state.uid } : null; } } }));
vi.mock('../../api/authAPI', () => ({ observeAuthState: (callback: typeof state.authCallback) => { state.authCallback = callback; return () => undefined; } }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('firebase/firestore', async original => ({ ...await original<typeof import('firebase/firestore')>(), doc: () => 'profile', onSnapshot: (_ref: unknown, next: typeof state.profileNext, error: () => void) => { state.profileNext = next; state.profileError = error; return () => undefined; } }));
const profile = () => ({ uid: 'staff', email: 'staff@example.test', fullName: 'Staff', role: 'staff' as const, department: 'bar' as const, businessId: 'a', isOnShift: true, shiftStartedAt: Timestamp.fromMillis(1700000000000) });
function Probe() { const auth = useAuth(); const offline = useOffline(); return <div>{auth.role ?? 'none'}|{String(auth.isOnShift)}|{auth.shiftStartedAt?.toMillis() ?? 'no-time'}|pending:{offline.pendingCount}</div>; }
function mount() { return render(<AuthProvider><OfflineProvider><Probe /></OfflineProvider></AuthProvider>); }
beforeEach(async () => { vi.stubGlobal('navigator', { onLine: false }); state.uid = 'staff'; await offlineStore.close(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase('tossit-offline-v1'); r.onsuccess = () => resolve(); }); });
afterEach(async () => { cleanup(); await offlineStore.close(); vi.unstubAllGlobals(); });
describe('offline session hydration and provider isolation', () => {
  it('restores only the current cached verified profile and its original shift instant', async () => {
    await rememberProfile(profile()); mount();
    act(() => state.authCallback!({ uid: 'staff' }));
    await waitFor(() => expect(screen.getByText('staff|true|1700000000000|pending:0')).toBeInTheDocument());
  });
  it('shows pending counts for the current session and clears them on logout without deleting work', async () => {
    await rememberProfile(profile());
    await offlineStore.enqueue(profile(), { kind: 'open', input: { operationId: 'offline-test-1', productId: 'milk', amount: 0.5, openedAtMs: 1700000000000 }, catalogFingerprint: 'fixture' });
    mount(); act(() => state.authCallback!({ uid: 'staff' }));
    await waitFor(() => expect(screen.getByText(/pending:1/)).toBeInTheDocument());
    state.uid = null; act(() => state.authCallback!(null));
    await waitFor(() => expect(screen.getByText(/none\|false\|no-time\|pending:0/)).toBeInTheDocument());
    expect(await offlineStore.list(profile())).toHaveLength(1);
  });
  it('never restores another UID cached profile when the new account has no offline snapshot', async () => {
    await rememberProfile(profile()); state.uid = 'other'; mount();
    act(() => state.authCallback!({ uid: 'other' }));
    await waitFor(() => expect(screen.getByText(/none\|false/)).toBeInTheDocument());
  });
  it('does not let a late cached profile overwrite a newer realtime profile for the same UID', async () => {
    let release!: (value: ReturnType<typeof profile>) => void;
    const cached = vi.spyOn(storage, 'readRememberedProfile').mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    try {
      mount(); act(() => state.authCallback!({ uid: 'staff' }));
      act(() => state.profileNext!({ exists: () => true, data: () => ({ ...profile(), role: 'manager' }), metadata: { fromCache: false } }));
      await act(async () => { release(profile()); });
      expect(screen.getByText(/manager\|true/)).toBeInTheDocument();
    } finally { cached.mockRestore(); }
  });
});
