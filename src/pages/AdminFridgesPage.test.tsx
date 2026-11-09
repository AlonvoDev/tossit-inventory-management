import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Fridge } from '../types/Fridge';

const api = vi.hoisted(() => ({
  getBusinessFridges: vi.fn(),
  addFridge: vi.fn(),
  updateFridge: vi.fn(),
  deleteFridge: vi.fn(),
}));
vi.mock('../api/fridgesAPI', () => api);
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));

import AdminFridgesPage from './AdminFridgesPage';

const fridges: Fridge[] = [
  { id: 'f1', name: 'מקרר בר', department: 'bar', businessId: 'b1' },
  { id: 'f2', name: 'מקרר מטבח', department: 'kitchen', businessId: 'b1' },
  { id: 'f3', name: 'מקרר ישן', department: 'מטבח' as never, businessId: 'b1' },
];

const asRole = (role: 'admin' | 'manager', department: string, isOffline = false) => {
  auth.current = {
    businessId: 'b1',
    role,
    profile: { uid: 'u', fullName: 'x', email: 'x@y.co', role, department, businessId: 'b1' },
    isOffline,
    loading: false,
  };
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminFridgesPage />
    </MemoryRouter>,
  );

describe('AdminFridgesPage', () => {
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    api.getBusinessFridges.mockResolvedValue(fridges);
  });

  it('kitchen manager sees only kitchen fridges including legacy values', async () => {
    asRole('manager', 'kitchen');
    renderPage();
    expect(await screen.findByText('מקרר מטבח')).toBeInTheDocument();
    expect(screen.getByText('מקרר ישן')).toBeInTheDocument();
    expect(screen.queryByText('מקרר בר')).not.toBeInTheDocument();
  });

  it('manager adds a fridge only in their department', async () => {
    asRole('manager', 'kitchen');
    api.addFridge.mockResolvedValue('new');
    renderPage();
    await screen.findByText('מקרר מטבח');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מקרר' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('שם'), { target: { value: 'מקפיא' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'הוסף' }));
    await waitFor(() =>
      expect(api.addFridge).toHaveBeenCalledWith({ name: 'מקפיא', department: 'kitchen', businessId: 'b1' }),
    );
  });

  it('rejects a duplicate fridge name', async () => {
    asRole('admin', 'bar');
    renderPage();
    await screen.findByText('מקרר בר');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מקרר' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('שם'), { target: { value: ' מקרר בר ' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'הוסף' }));
    expect(within(dialog).getByText('כבר קיים מקרר בשם הזה')).toBeInTheDocument();
    expect(api.addFridge).not.toHaveBeenCalled();
  });

  it('maps permission errors to Hebrew and keeps the dialog open', async () => {
    asRole('admin', 'bar');
    api.addFridge.mockRejectedValue(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));
    renderPage();
    await screen.findByText('מקרר בר');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף מקרר' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('שם'), { target: { value: 'חדש' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'הוסף' }));
    expect(await within(dialog).findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
    expect(screen.queryByText(/insufficient/)).not.toBeInTheDocument();
  });

  it('disables changes while offline', async () => {
    asRole('admin', 'bar', true);
    renderPage();
    await screen.findByText('מקרר בר');
    expect(screen.getByRole('button', { name: 'הוסף מקרר' })).toBeDisabled();
    screen.getAllByRole('button', { name: 'מחק' }).forEach(b => expect(b).toBeDisabled());
  });
});
