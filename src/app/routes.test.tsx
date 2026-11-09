import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseAuthReturn } from '../context/AuthContext';

// Controllable auth state; the real provider is Codex-owned and replaced in C1.
const authState: { current: Partial<UseAuthReturn> } = { current: {} };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

// Stub screens so tests assert routing decisions, not page internals.
vi.mock('../pages/Dashboard', () => ({ default: () => <div>SCREEN:dashboard</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>SCREEN:login</div> }));
vi.mock('../pages/AdminPanel', () => ({ default: () => <div>SCREEN:admin</div> }));
vi.mock('../pages/AdminUsersPage', () => ({ default: () => <div>SCREEN:admin-users</div> }));
vi.mock('../pages/AdminFridgesPage', () => ({ default: () => <div>SCREEN:admin-fridges</div> }));
vi.mock('../features/reports/ReportsPage', () => ({ ReportsPage: () => <div>SCREEN:reports</div> }));
vi.mock('../features/settings/SettingsPage', () => ({ SettingsPage: () => <div>SCREEN:settings</div> }));

import { AppRoutes } from './routes';
import { canAccessRoute, ROUTE_ACCESS, AppRouteId } from './access';

const signedInAs = (role: 'admin' | 'manager' | 'staff'): Partial<UseAuthReturn> => ({
  user: { uid: `${role}-uid` } as UseAuthReturn['user'],
  loading: false,
  isAuthenticated: true,
  profileNotFound: false,
  role,
  logout: vi.fn().mockResolvedValue(undefined),
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

const expected: Record<'admin' | 'manager' | 'staff', Record<AppRouteId, boolean>> = {
  admin: { dashboard: true, admin: true, adminUsers: true, adminFridges: true, reports: true, settings: true },
  manager: { dashboard: true, admin: true, adminUsers: false, adminFridges: true, reports: true, settings: false },
  staff: { dashboard: true, admin: false, adminUsers: false, adminFridges: false, reports: false, settings: false },
};

const screenName: Record<AppRouteId, string> = {
  dashboard: 'SCREEN:dashboard',
  admin: 'SCREEN:admin',
  adminUsers: 'SCREEN:admin-users',
  adminFridges: 'SCREEN:admin-fridges',
  reports: 'SCREEN:reports',
  settings: 'SCREEN:settings',
};

describe('permission matrix', () => {
  it('grants nothing to unknown or missing roles', () => {
    for (const id of Object.keys(ROUTE_ACCESS) as AppRouteId[]) {
      expect(canAccessRoute(null, id)).toBe(false);
      expect(canAccessRoute('user', id)).toBe(false);
      expect(canAccessRoute('ADMIN', id)).toBe(false);
    }
  });
});

describe('AppRoutes role access', () => {
  for (const role of ['admin', 'manager', 'staff'] as const) {
    for (const id of Object.keys(ROUTE_ACCESS) as AppRouteId[]) {
      const allowed = expected[role][id];
      it(`${role} ${allowed ? 'can' : 'cannot'} open ${ROUTE_ACCESS[id].path}`, () => {
        authState.current = signedInAs(role);
        renderAt(ROUTE_ACCESS[id].path);
        if (allowed) {
          expect(screen.getByText(screenName[id])).toBeInTheDocument();
        } else {
          expect(screen.queryByText(screenName[id])).not.toBeInTheDocument();
          expect(screen.getByText('אין הרשאה')).toBeInTheDocument();
        }
      });
    }
  }
});

describe('AppRoutes identity states', () => {
  beforeEach(() => {
    authState.current = {};
  });

  it('shows only a loading state while identity resolves, even for an admin path', () => {
    authState.current = { ...signedInAs('admin'), loading: true };
    renderAt('/admin/users');
    expect(screen.getByRole('status')).toHaveTextContent('טוען');
    expect(screen.queryByText('SCREEN:admin-users')).not.toBeInTheDocument();
  });

  it('redirects signed-out users from protected screens to login', () => {
    authState.current = { user: null, loading: false, isAuthenticated: false, profileNotFound: false, role: null };
    renderAt('/admin');
    expect(screen.getByText('SCREEN:login')).toBeInTheDocument();
    expect(screen.queryByText('SCREEN:admin')).not.toBeInTheDocument();
  });

  it('blocks a signed-in account whose profile is missing', () => {
    authState.current = {
      ...signedInAs('admin'),
      isAuthenticated: false,
      profileNotFound: true,
      role: null,
    };
    renderAt('/dashboard');
    expect(screen.getByText('אין גישה לאפליקציה')).toBeInTheDocument();
    expect(screen.queryByText('SCREEN:dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התנתק' })).toBeInTheDocument();
  });

  it('blocks a disabled/unauthorized profile even if a stale role value is present', () => {
    // C1 contract: disabled profiles resolve to isAuthenticated=false.
    authState.current = { ...signedInAs('admin'), isAuthenticated: false, profileNotFound: false };
    renderAt('/admin');
    expect(screen.queryByText('SCREEN:admin')).not.toBeInTheDocument();
    expect(screen.getByText('לא ניתן לטעון את פרטי ההרשאה')).toBeInTheDocument();
  });

  it('sends a signed-in user away from public login', () => {
    authState.current = signedInAs('staff');
    renderAt('/login');
    expect(screen.getByText('SCREEN:dashboard')).toBeInTheDocument();
  });

  it('public register page explains admin-controlled onboarding without a signup form', () => {
    authState.current = { user: null, loading: false, isAuthenticated: false, profileNotFound: false, role: null };
    renderAt('/register');
    expect(screen.getByText('איך מקבלים גישה ל-TossIt?')).toBeInTheDocument();
    expect(screen.queryByLabelText(/סיסמה|password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
  });
});
