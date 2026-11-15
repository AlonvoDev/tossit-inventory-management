// UI2-R1: the real FloatingActionButton dialog with the real OpenItemForm (only API boundaries mocked).
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ products: vi.fn(), fridges: vi.fn(), open: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    businessId: 'review-business',
    role: 'admin',
    isOnShift: true,
    isOffline: false,
    user: { uid: 'review-admin' },
    profile: { uid: 'review-admin', businessId: 'review-business', department: 'bar', role: 'admin' },
  }),
}));
vi.mock('../api/productsAPI', () => ({ getBusinessProducts: api.products }));
vi.mock('../api/fridgesAPI', () => ({ getBusinessFridges: api.fridges }));
vi.mock('../api/inventoryOperations', () => ({ openInventoryItem: api.open }));

import FloatingActionButton from './FloatingActionButton';

type Receipt = { operationId: string; itemId: string; state: 'synced' | 'pending' };

const dialog = () => screen.queryByRole('dialog', { name: 'פתיחת פריט — בר' });
const amount = () => screen.getByRole('textbox', { name: 'כמות' });
const exitTransition = () => act(async () => { await new Promise(r => setTimeout(r, 350)); });

/** Opens the dialog, picks the product, sets the amount and submits into the mocked API. */
const submitOpening = async (value = '3') => {
  render(<FloatingActionButton variant="inline" department="bar" onItemAdded={() => {}} />);
  await userEvent.click(screen.getByRole('button', { name: 'פתיחת פריט' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'מוצר' })).not.toBeDisabled());
  await userEvent.click(screen.getByRole('combobox', { name: 'מוצר' }));
  await userEvent.click(await screen.findByRole('option', { name: /פריט בדיקה/ }));
  fireEvent.change(amount(), { target: { value } });
  await userEvent.click(screen.getByRole('button', { name: 'פתח פריט' }));
  await waitFor(() => expect(api.open).toHaveBeenCalledTimes(1));
};

const tryToDismiss = async (method: 'escape' | 'header' | 'backdrop') => {
  if (method === 'escape') {
    act(() => screen.getByRole('button', { name: 'סגירה' }).focus());
    await userEvent.keyboard('{Escape}');
  } else if (method === 'header') {
    await userEvent.click(screen.getByRole('button', { name: 'סגירה' }));
  } else {
    const container = document.querySelector('.MuiDialog-container')!;
    fireEvent.mouseDown(container);
    fireEvent.click(container);
  }
  await exitTransition();
};

describe('open-item dialog while a submission is pending (UI2-R1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.products.mockResolvedValue([
      { id: 'review-product', name: 'פריט בדיקה', type: 'units', shelfLifeDays: 2, area: 'bar', businessId: 'review-business' },
    ]);
    api.fridges.mockResolvedValue([]);
  });

  it.each(['escape', 'header', 'backdrop'] as const)('keeps the real form, values and intent mounted (%s)', async method => {
    let resolve!: (receipt: Receipt) => void;
    api.open.mockImplementation(() => new Promise<Receipt>(r => (resolve = r)));
    await submitOpening();
    try {
      await tryToDismiss(method);
      expect(dialog()).not.toBeNull();
      expect(amount()).toHaveValue('3');
      expect(screen.getByRole('button', { name: 'שולח...' })).toBeDisabled();
      expect(api.open).toHaveBeenCalledTimes(1); // no second intent
    } finally {
      await act(async () => resolve({ operationId: 'x', itemId: 'x', state: 'synced' }));
    }
  });

  it('after a rejected pending request: error and values remain, controls recover, retry reuses the exact intent', async () => {
    let reject!: (e: unknown) => void;
    api.open.mockImplementationOnce(() => new Promise((_, r) => (reject = r)));
    await submitOpening('4');
    await tryToDismiss('header'); // attempted while pending: ignored
    await act(async () => reject(Object.assign(new Error('network'), { code: 'unavailable' })));
    expect(await screen.findByText(/ניסיון חוזר לא ייצור פריט כפול/)).toBeInTheDocument();
    expect(screen.queryByText(/נפתח/)).not.toBeInTheDocument();
    expect(dialog()).not.toBeNull();
    expect(amount()).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'פתח פריט' })).toBeEnabled();
    api.open.mockResolvedValueOnce({ operationId: 'x', itemId: 'x', state: 'synced' });
    await userEvent.click(screen.getByRole('button', { name: 'פתח פריט' }));
    await waitFor(() => expect(api.open).toHaveBeenCalledTimes(2));
    const [first, second] = api.open.mock.calls.map(c => c[0]);
    expect(second.operationId).toBe(first.operationId);
    expect(second.openedAtMs).toBe(first.openedAtMs);
    expect(second).toEqual(first);
  });

  it.each([
    ['synced', /"פריט בדיקה" נפתח\. תוקף עד/],
    ['pending', /נשמר במכשיר וממתין לשליחה לשרת\. הוא עדיין לא נשמר בשרת/],
  ] as const)('after a %s receipt: truthful message, normal close restored and focus returns', async (state, message) => {
    let resolve!: (receipt: Receipt) => void;
    api.open.mockImplementation(() => new Promise<Receipt>(r => (resolve = r)));
    await submitOpening();
    await act(async () => resolve({ operationId: 'x', itemId: 'x', state }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    const opener = screen.getByRole('button', { name: 'פתיחת פריט', hidden: true });
    await userEvent.click(screen.getByRole('button', { name: 'סגירה' }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('idle dismissal still works (nothing submitted)', async () => {
    render(<FloatingActionButton variant="inline" department="bar" onItemAdded={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'פתיחת פריט' }));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog()).toBeNull());
  });
});
