import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('../components/ItemsList', () => ({ default: () => <div>ITEMS</div> }));
vi.mock('../components/ProductManagement', () => ({ default: () => <div>PRODUCTS</div> }));
vi.mock('../components/DiscardReport', () => ({ default: () => <div>REPORT</div> }));

import AdminPanel from './AdminPanel';

const renderAs = (role: 'admin' | 'manager', path = '/admin') => {
  auth.current = {
    profile: { uid: 'u', fullName: 'x', email: 'x@y.co', role, department: 'bar', businessId: 'b1' },
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    loading: false,
    isOffline: false,
    logout: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminPanel />
    </MemoryRouter>,
  );
};

describe('AdminPanel', () => {
  it.each(['admin', 'manager'] as const)('offers no QA tool that writes test data for %s', role => {
    renderAs(role);
    expect(screen.queryByRole('tab', { name: /בדיקת איכות/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Debug Information/)).not.toBeInTheDocument();
  });

  it('ignores the old ?tab=qa link', () => {
    renderAs('admin', '/admin?tab=qa');
    expect(screen.queryByText(/בדיקות איכות/)).not.toBeInTheDocument();
    expect(screen.getAllByText('ITEMS').length).toBeGreaterThan(0);
  });

  it('managers do not see the admin-only users tab', () => {
    renderAs('manager');
    expect(screen.queryByRole('tab', { name: /ניהול משתמשים/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ניהול מוצרים/ })).toBeInTheDocument();
  });
});
