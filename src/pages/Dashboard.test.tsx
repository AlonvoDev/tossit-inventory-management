import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('../components/ItemsList', () => ({
  default: (p: { areaFilter?: string; showDiscardedOnly?: boolean }) => (
    <div>ITEMS:{p.showDiscardedOnly ? 'discarded' : p.areaFilter}</div>
  ),
}));
vi.mock('../components/DashboardKPIs', () => ({ default: () => null }));
vi.mock('../components/ShiftButton', () => ({ default: () => null }));
vi.mock('../components/FloatingActionButton', () => ({
  default: (p: { department: string }) => <div>FAB:{p.department}</div>,
}));
vi.mock('../services/discardScheduler', () => ({ startDiscardScheduler: vi.fn(), stopDiscardScheduler: vi.fn() }));

import Dashboard from './Dashboard';

const as = (role: string, department: string) => {
  auth.current = {
    role,
    isOffline: false,
    profile: { uid: 'u', fullName: 'דנה', email: 'd@x.co', role, department, businessId: 'b1' },
  };
};
const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe('Dashboard', () => {
  beforeEach(() => localStorage.clear());

  it('never clears legacy queued operations or caches on mount', () => {
    localStorage.setItem('pendingOperations', '[{"type":"add"}]');
    localStorage.setItem('cachedItems_bar', '[]');
    as('staff', 'bar');
    renderDashboard();
    expect(localStorage.getItem('pendingOperations')).toBe('[{"type":"add"}]');
    expect(localStorage.getItem('cachedItems_bar')).toBe('[]');
  });

  it('staff see only their own department, with canonical values passed down', () => {
    as('staff', 'מטבח');
    renderDashboard();
    expect(screen.getByRole('tab', { name: /מטבח/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^בר$/ })).not.toBeInTheDocument();
    expect(screen.getByText('ITEMS:kitchen')).toBeInTheDocument();
    expect(screen.getByText('FAB:kitchen')).toBeInTheDocument();
    expect(screen.getByText('מטבח', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('admins see both departments', () => {
    as('admin', 'bar');
    renderDashboard();
    expect(screen.getByRole('tab', { name: /בר/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /מטבח/ })).toBeInTheDocument();
  });

  it('has no development tools (self-promotion, sample data)', () => {
    as('admin', 'bar');
    renderDashboard();
    expect(screen.queryByText('קבע הרשאות מנהל')).not.toBeInTheDocument();
    expect(screen.queryByText('הוסף מוצרי דוגמה')).not.toBeInTheDocument();
  });
});
