import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { useAuth as useLegacyAuth } from '../../hooks/useAuth';
import { ShiftProvider, useShift } from '../../context/ShiftContext';

const transport = vi.hoisted(() => ({
  authListener: undefined as undefined | ((user: User | null) => void),
  legacyAuthListener: undefined as undefined | ((user: User | null) => void),
  profileListener: undefined as undefined | ((snapshot: unknown) => void),
  profileError: undefined as undefined | ((error: Error) => void),
  currentData: null as Record<string, unknown> | null,
  currentUser: null as User | null,
  finishShift: undefined as undefined | (() => void),
}));

vi.mock('../../services/firebase', () => ({
  db: {}, auth: { get currentUser() { return transport.currentUser; } },
}));
vi.mock('../../api/authAPI', () => ({
  startShift: () => new Promise<void>(resolve => { transport.finishShift = resolve; }),
  endShift: async () => undefined,
  observeAuthState: (listener: (user: User | null) => void) => {
    transport.authListener = listener;
    return () => { transport.authListener = undefined; };
  },
}));
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(async () => undefined),
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    transport.legacyAuthListener = listener;
    return () => { transport.legacyAuthListener = undefined; };
  },
}));
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (_db: unknown, _collection: string, uid: string) => ({ uid }),
    getDoc: async () => snapshot(transport.currentData),
    onSnapshot: (_ref: unknown, next: (value: unknown) => void, error: (e: Error) => void) => {
      transport.profileListener = next;
      transport.profileError = error;
      next(snapshot(transport.currentData));
      return () => undefined;
    },
  };
});

function snapshot(data: Record<string, unknown> | null) {
  return { exists: () => data !== null, data: () => data };
}
function profile(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'admin-1', fullName: 'Admin', email: 'admin@example.test',
    role: 'admin', department: 'bar', businessId: 'business-a', isOnShift: false,
    ...overrides,
  };
}
function Probe() {
  const auth = useAuth();
  const legacy = useLegacyAuth();
  return <output data-testid="auth">{JSON.stringify({
    user: auth.user?.uid, profile: auth.profile?.uid, role: auth.role,
    businessId: auth.businessId, loading: auth.loading,
    authenticated: auth.isAuthenticated, isAdmin: auth.isAdmin,
    onShift: auth.isOnShift, startedAt: auth.shiftStartedAt?.toMillis(),
    legacyProfile: legacy.userProfile?.uid, legacyAuthenticated: legacy.isAuthenticated,
    legacyUserId: legacy.userId,
  })}</output>;
}
function read() { return JSON.parse(screen.getByTestId('auth').textContent || '{}'); }
async function signIn(uid: string, data: Record<string, unknown> | null) {
  transport.currentData = data;
  transport.currentUser = { uid, email: `${uid}@example.test` } as User;
  await act(async () => {
    transport.authListener?.(transport.currentUser);
    transport.legacyAuthListener?.(transport.currentUser);
  });
  await waitFor(() => expect(read().loading).toBe(false));
}

beforeEach(() => {
  transport.currentData = null;
  transport.currentUser = null;
  transport.authListener = undefined;
  transport.legacyAuthListener = undefined;
  transport.profileListener = undefined;
  transport.profileError = undefined;
  localStorage.clear();
});
afterEach(cleanup);

describe('authoritative user session', () => {
  it('shares the profile and authorization with the legacy hook without another observer', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    expect(read()).toMatchObject({ profile: 'admin-1', legacyProfile: 'admin-1', legacyUserId: 'admin-1', isAdmin: true });
  });

  it('restores the saved active shift after a fresh mount', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile({ isOnShift: true, shiftStartedAt: Timestamp.fromMillis(1700000000000) }));
    expect(read()).toMatchObject({ onShift: true, startedAt: 1700000000000 });
  });

  it('replaces the old admin profile when Firebase changes to another UID', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    await signIn('staff-2', profile({ uid: 'staff-2', role: 'staff', businessId: 'business-b' }));
    expect(read()).toMatchObject({ user: 'staff-2', profile: 'staff-2', role: 'staff', isAdmin: false, businessId: 'business-b' });
  });

  it('ignores a late snapshot from a previously signed-in user', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    const previousListener = transport.profileListener;
    await signIn('staff-2', profile({ uid: 'staff-2', role: 'staff' }));
    await act(async () => { previousListener?.(snapshot(profile())); });
    expect(read()).toMatchObject({ profile: 'staff-2', isAdmin: false });
  });

  it.each([
    ['missing', null],
    ['disabled', profile({ isActive: false })],
    ['malformed active flag', profile({ isActive: 'false' })],
    ['missing business', profile({ businessId: '' })],
    ['unknown role', profile({ role: 'superuser' })],
    ['wrong document identity', profile({ uid: 'someone-else' })],
  ])('denies both hooks for a %s profile', async (_name, data) => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', data);
    expect(read()).toMatchObject({ authenticated: false, legacyAuthenticated: false, isAdmin: false, businessId: null });
  });

  it('revokes cached authority immediately when the profile is disabled remotely', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    await act(async () => { transport.profileListener?.(snapshot(profile({ isActive: false }))); });
    expect(read()).toMatchObject({ authenticated: false, isAdmin: false });
  });

  it('does not trust a localStorage demo profile', async () => {
    localStorage.setItem('demoUser', JSON.stringify(profile()));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { transport.authListener?.(null); });
    expect(read()).toMatchObject({ authenticated: false, legacyAuthenticated: false, isAdmin: false });
  });

  it('clears both consumers on sign-out and ignores a late profile update', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    const previousListener = transport.profileListener;
    await act(async () => {
      transport.authListener?.(null);
      transport.legacyAuthListener?.(null);
      previousListener?.(snapshot(profile()));
    });
    expect(read()).toMatchObject({ authenticated: false, legacyAuthenticated: false, isAdmin: false, businessId: null });
  });

  it('revokes authority when the profile listener reports denied access', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile());
    await act(async () => { transport.profileError?.(new Error('permission-denied')); });
    expect(read()).toMatchObject({ authenticated: false, legacyAuthenticated: false, isAdmin: false, businessId: null });
  });

  it('reads legacy staff and Hebrew department values without granting admin', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn('admin-1', profile({ role: 'user', department: 'בר' }));
    expect(read()).toMatchObject({ authenticated: true, role: 'staff', isAdmin: false });
  });

  it('does not let a previous identity pending shift grant the next identity a shift', async () => {
    function ShiftProbe() {
      const shift = useShift();
      return <><button onClick={() => void shift.startUserShift()}>Start shift</button><output data-testid="shift">{String(shift.isOnShift)}</output></>;
    }
    render(<AuthProvider><ShiftProvider><Probe /><ShiftProbe /></ShiftProvider></AuthProvider>);
    await signIn('admin-1', profile());
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await signIn('staff-2', profile({ uid: 'staff-2', role: 'staff' }));
    await act(async () => { transport.finishShift?.(); });
    expect(screen.getByTestId('shift')).toHaveTextContent('false');
  });
});
