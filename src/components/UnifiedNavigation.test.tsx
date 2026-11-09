import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { UseAuthReturn } from '../context/AuthContext';

const authState: { current: Partial<UseAuthReturn> } = { current: {} };
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState.current }));
vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({ showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../api/authAPI', () => ({ createUserByAdmin: vi.fn() }));
vi.mock('../api/categoriesAPI', () => ({ addCustomCategory: vi.fn() }));
vi.mock('./ClockDisplay', () => ({ default: () => null }));

import UnifiedNavigation from './UnifiedNavigation';

type Role = 'admin' | 'manager' | 'staff';

const as = (role: Role): Partial<UseAuthReturn> => ({
  user: { uid: 'u1', email: 'u@example.com' } as UseAuthReturn['user'],
  profile: {
    uid: 'u1',
    fullName: 'דנה',
    email: 'u@example.com',
    role,
    department: 'kitchen',
    businessId: 'b1',
  },
  role,
  isOffline: false,
  logout: vi.fn().mockResolvedValue(undefined),
});

const openMenu = async (role: Role) => {
  authState.current = as(role);
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <UnifiedNavigation />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'menu' }));
  return within(screen.getByRole('menu'));
};

const ALL = ['לוח הבקרה', 'ניהול מערכת', 'ניהול משתמשים', 'הוסף משתמש חדש', 'ניהול מקררים', 'הוסף קטגוריה חדשה', 'דוחות', 'הגדרות', 'התנתק'];

const visibleFor: Record<Role, string[]> = {
  admin: ALL,
  manager: ['לוח הבקרה', 'ניהול מערכת', 'ניהול מקררים', 'דוחות', 'התנתק'],
  staff: ['לוח הבקרה', 'התנתק'],
};

describe('UnifiedNavigation menu matches route access', () => {
  for (const role of ['admin', 'manager', 'staff'] as const) {
    it(`shows only permitted entries for ${role}`, async () => {
      const menu = await openMenu(role);
      for (const label of ALL) {
        if (visibleFor[role].includes(label)) {
          expect(menu.getByText(label)).toBeInTheDocument();
        } else {
          expect(menu.queryByText(label)).not.toBeInTheDocument();
        }
      }
    });
  }

  it('does not show fake notification counts', async () => {
    await openMenu('admin');
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('shows Hebrew role and department labels', async () => {
    const menu = await openMenu('manager');
    expect(menu.getByText('מנהל מחלקה')).toBeInTheDocument();
    expect(menu.getByText('מטבח')).toBeInTheDocument();
    expect(menu.queryByText('kitchen')).not.toBeInTheDocument();
  });

  it('add user opens the single create form on the users page', async () => {
    authState.current = as('admin');
    const Where = () => {
      const loc = useLocation();
      return <div data-testid="where">{loc.pathname + loc.search}</div>;
    };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <UnifiedNavigation />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'menu' }));
    await userEvent.click(within(screen.getByRole('menu')).getByText('הוסף משתמש חדש'));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/users?add=1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing without a profile', () => {
    authState.current = { ...as('admin'), profile: null };
    const { container } = render(
      <MemoryRouter>
        <UnifiedNavigation />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
