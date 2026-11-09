import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Product } from '../types/Product';
import type { Fridge } from '../types/Fridge';

const api = vi.hoisted(() => ({
  getBusinessProducts: vi.fn(),
  getBusinessFridges: vi.fn(),
  openInventoryItem: vi.fn(),
}));
vi.mock('../api/productsAPI', () => ({ getBusinessProducts: api.getBusinessProducts }));
vi.mock('../api/fridgesAPI', () => ({ getBusinessFridges: api.getBusinessFridges }));
vi.mock('../api/inventoryOperations', () => ({ openInventoryItem: api.openInventoryItem }));
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));

import OpenItemForm from './OpenItemForm';

const products: Product[] = [
  { id: 'p-kg', productId: 'P001', name: 'עוף', shelfLifeDays: 2, type: 'kg', area: 'kitchen', businessId: 'b1', fridgeId: 'f-k' },
  { id: 'p-u', productId: 'P002', name: 'ביצים', shelfLifeDays: 7, type: 'units', area: 'kitchen', businessId: 'b1' },
  { id: 'p-bar', productId: 'P003', name: 'לימון', shelfLifeDays: 3, type: 'units', area: 'bar', businessId: 'b1' },
];
const fridges: Fridge[] = [
  { id: 'f-k', name: 'מקרר מטבח', department: 'kitchen', businessId: 'b1' },
  { id: 'f-b', name: 'מקרר בר', department: 'bar', businessId: 'b1' },
];

const as = (role: string, isOnShift: boolean, isOffline = false) => {
  auth.current = { businessId: 'b1', role, isOnShift, isOffline };
};

const pick = async (name: RegExp) => {
  await userEvent.click(screen.getByRole('combobox', { name: 'מוצר' }));
  await userEvent.click(await screen.findByRole('option', { name }));
};
const amount = () => screen.getByRole('textbox', { name: 'כמות' });
const submit = () => screen.getByRole('button', { name: 'פתח פריט' });

describe('OpenItemForm', () => {
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    api.getBusinessProducts.mockResolvedValue(products);
    api.getBusinessFridges.mockResolvedValue(fridges);
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('11111111-aaaa-bbbb-cccc-000000000001').mockReturnValueOnce('22222222-aaaa-bbbb-cccc-000000000002');
  });

  it('offers only the department catalog and fridges', async () => {
    as('staff', true);
    render(<OpenItemForm department="kitchen" />);
    await userEvent.click(await screen.findByRole('combobox', { name: 'מוצר' }));
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText(/עוף/)).toBeInTheDocument();
    expect(within(list).queryByText(/לימון/)).not.toBeInTheDocument();
  });

  it('opens 0.5 kg with the product fridge preselected and reports a synced receipt with expiry', async () => {
    as('staff', true);
    api.openInventoryItem.mockResolvedValue({ operationId: 'x', itemId: 'x', state: 'synced' });
    const onItemAdded = vi.fn();
    render(<OpenItemForm department="kitchen" onItemAdded={onItemAdded} />);
    await pick(/עוף/);
    fireEvent.change(amount(), { target: { value: '0.5' } });
    await userEvent.click(submit());
    await waitFor(() => expect(api.openInventoryItem).toHaveBeenCalledTimes(1));
    const input = api.openInventoryItem.mock.calls[0][0];
    expect(input).toMatchObject({ operationId: '11111111-aaaa-bbbb-cccc-000000000001', productId: 'p-kg', amount: 0.5, fridgeId: 'f-k' });
    expect(typeof input.openedAtMs).toBe('number');
    expect(input).not.toHaveProperty('businessId');
    expect(input).not.toHaveProperty('userId');
    expect(await screen.findByText(/"עוף" נפתח. תוקף עד/)).toBeInTheDocument();
    expect(onItemAdded).toHaveBeenCalled();
  });

  it('rejects fractional units without calling the server', async () => {
    as('staff', true);
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    fireEvent.change(amount(), { target: { value: '1.5' } });
    await userEvent.click(submit());
    expect(await screen.findAllByText(/מספר שלם של יחידות/)).not.toHaveLength(0);
    expect(api.openInventoryItem).not.toHaveBeenCalled();
  });

  it('retrying after a failed send reuses the same operation ID and opening time', async () => {
    as('staff', true);
    api.openInventoryItem
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'unavailable' }))
      .mockResolvedValueOnce({ operationId: 'x', itemId: 'x', state: 'synced' });
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    await userEvent.click(submit());
    expect(await screen.findByText(/ניסיון חוזר לא ייצור פריט כפול/)).toBeInTheDocument();
    expect(screen.queryByText(/נפתח/)).not.toBeInTheDocument();
    await userEvent.click(submit());
    await waitFor(() => expect(api.openInventoryItem).toHaveBeenCalledTimes(2));
    const [first, second] = api.openInventoryItem.mock.calls.map(c => c[0]);
    expect(second.operationId).toBe(first.operationId);
    expect(second.openedAtMs).toBe(first.openedAtMs);
  });

  it('a changed amount after a failure is a new intent', async () => {
    as('staff', true);
    api.openInventoryItem.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    await userEvent.click(submit());
    await screen.findByText(/ניסיון חוזר/);
    fireEvent.change(amount(), { target: { value: '2' } });
    await userEvent.click(submit());
    await waitFor(() => expect(api.openInventoryItem).toHaveBeenCalledTimes(2));
    const [first, second] = api.openInventoryItem.mock.calls.map(c => c[0]);
    expect(second.operationId).not.toBe(first.operationId);
  });

  it('permission errors are shown and never treated as success', async () => {
    as('staff', true);
    api.openInventoryItem.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    await userEvent.click(submit());
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
    expect(screen.queryByText(/נפתח|ממתין/)).not.toBeInTheDocument();
  });

  it('off-shift staff cannot open items; managers can', async () => {
    as('staff', false);
    const { unmount } = render(<OpenItemForm department="kitchen" />);
    expect(await screen.findByText('יש להתחיל משמרת כדי לפתוח פריטים.')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    unmount();
    as('manager', false);
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    expect(submit()).toBeEnabled();
  });

  it('offline: allowed, explained, and a pending receipt is not called saved', async () => {
    as('staff', true, true);
    api.openInventoryItem.mockResolvedValue({ operationId: 'x', itemId: 'x', state: 'pending' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<OpenItemForm department="kitchen" />);
    expect(await screen.findByText(/הפריט יישמר במכשיר וישלח לשרת/)).toBeInTheDocument();
    await pick(/ביצים/);
    await userEvent.click(submit());
    expect(await screen.findByText(/נשמר במכשיר וממתין לשליחה לשרת. הוא עדיין לא נשמר בשרת/)).toBeInTheDocument();
    expect(screen.queryByText(/נפתח. תוקף/)).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalledWith('pendingOperations', expect.anything());
    setItem.mockRestore();
  });

  it('ignores repeated submits while sending', async () => {
    as('staff', true);
    let resolve!: (v: unknown) => void;
    api.openInventoryItem.mockReturnValue(new Promise(r => (resolve = r)));
    render(<OpenItemForm department="kitchen" />);
    await pick(/ביצים/);
    await userEvent.click(submit());
    const sending = screen.getByRole('button', { name: 'שולח...' });
    expect(sending).toBeDisabled();
    fireEvent.submit(sending.closest('form')!);
    expect(api.openInventoryItem).toHaveBeenCalledTimes(1);
    resolve({ operationId: 'x', itemId: 'x', state: 'synced' });
    expect(await screen.findByText(/נפתח/)).toBeInTheDocument();
  });
});
