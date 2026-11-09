import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({
  listener: null as null | ((items: unknown[]) => void),
  onError: null as null | ((e: unknown) => void),
  subscribeBusinessItems: vi.fn(),
  getBusinessFridges: vi.fn(),
  closeInventoryItem: vi.fn(),
}));
vi.mock('../api/firestoreAPI', () => ({
  subscribeBusinessItems: (b: string, l: (items: unknown[]) => void, e: (err: unknown) => void) => {
    api.listener = l;
    api.onError = e;
    return api.subscribeBusinessItems(b);
  },
}));
vi.mock('../api/fridgesAPI', () => ({ getBusinessFridges: api.getBusinessFridges }));
vi.mock('../api/inventoryOperations', () => ({ closeInventoryItem: api.closeInventoryItem }));
vi.mock('../utils/expiryUtils', () => ({
  formatExpiryTime: () => '01/01',
  getExpiryStatus: () => ({ text: 'בתוקף', color: 'green' }),
}));
vi.mock('./LoadingSkeleton', () => ({ default: () => <div>LOADING</div> }));
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const offline = vi.hoisted(() => ({ operations: [] as { operationId: string; itemId: string; state: string }[] }));
vi.mock('../offline/OfflineProvider', () => ({
  useOffline: () => ({ operations: offline.operations, pendingCount: 0, failedCount: 0, error: null, retry: vi.fn() }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));

import ItemsList from './ItemsList';

const FUTURE = Date.now() + 5 * 24 * 3600 * 1000;
const ts = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) });
const mk = (id: string, name: string, area: string, extra: Record<string, unknown> = {}) => ({
  id, productName: name, area, type: 'kg', amount: 0.5, openingTime: ts(Date.now()), expiryTime: ts(FUTURE),
  userId: 'u', businessId: 'b1', discarded: false, isThrown: false, finished: false, ...extra,
});

const as = (role: string, isOnShift = true) => {
  auth.current = {
    businessId: 'b1', role, isOnShift, loading: false,
    profile: { uid: 'u', fullName: 'x', email: 'x@y.co', role, department: 'bar', businessId: 'b1' },
  };
};

const push = (items: unknown[]) => act(() => api.listener!(items));

describe('ItemsList', () => {
  beforeEach(() => {
    offline.operations = [];
    api.subscribeBusinessItems.mockReset().mockReturnValue(() => undefined);
    api.getBusinessFridges.mockReset().mockResolvedValue([]);
    api.closeInventoryItem.mockReset();
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-0000-0000-0000-000000000001')
      .mockReturnValueOnce('aaaaaaaa-0000-0000-0000-000000000002');
  });

  it('shows canonical-area items in the matching tab and updates live', async () => {
    as('staff');
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar'), mk('2', 'עוף', 'kitchen')]);
    expect(await screen.findByText('לימון')).toBeInTheDocument();
    expect(screen.queryByText('עוף')).not.toBeInTheDocument();
    push([mk('1', 'לימון', 'bar'), mk('3', 'נענע', 'בר')]);
    expect(await screen.findByText('נענע')).toBeInTheDocument();
  });

  it('discards with amount and reason via closeInventoryItem and reports success only after the receipt', async () => {
    as('staff');
    let resolve!: (v: unknown) => void;
    api.closeInventoryItem.mockReturnValue(new Promise(r => (resolve = r)));
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar')]);
    await userEvent.click(await screen.findByRole('button', { name: /עדכן סטטוס/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText(/נזרק/));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'כמות שנזרקה' }), { target: { value: '0.3' } });
    await userEvent.click(within(dialog).getByLabelText('נפגם'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'סמן כנזרק' }));
    expect(api.closeInventoryItem).toHaveBeenCalledWith({
      operationId: 'aaaaaaaa-0000-0000-0000-000000000001', itemId: '1', action: 'discarded', discardedAmount: 0.3, reason: 'damaged',
    });
    expect(screen.queryByText(/סומן כנזרק/)).not.toBeInTheDocument();
    resolve({ operationId: 'x', itemId: '1', state: 'synced' });
    expect(await screen.findByText('"לימון" סומן כנזרק')).toBeInTheDocument();
  });

  it('rejects a discarded amount larger than the batch', async () => {
    as('staff');
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar')]);
    await userEvent.click(await screen.findByRole('button', { name: /עדכן סטטוס/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText(/נזרק/));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'כמות שנזרקה' }), { target: { value: '0.6' } });
    await userEvent.click(within(dialog).getByLabelText('פג תוקף'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'סמן כנזרק' }));
    expect(within(dialog).getByText('הכמות לא יכולה לעלות על 0.5')).toBeInTheDocument();
    expect(api.closeInventoryItem).not.toHaveBeenCalled();
  });

  it('retry after a failed send reuses the operation ID', async () => {
    as('staff');
    api.closeInventoryItem
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'unavailable' }))
      .mockResolvedValueOnce({ operationId: 'x', itemId: '1', state: 'synced' });
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar')]);
    await userEvent.click(await screen.findByRole('button', { name: /עדכן סטטוס/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'סמן כנגמר' }));
    expect(await within(dialog).findByText(/ניסיון חוזר לא יבצע את הפעולה פעמיים/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'סמן כנגמר' }));
    await waitFor(() => expect(api.closeInventoryItem).toHaveBeenCalledTimes(2));
    expect(api.closeInventoryItem.mock.calls[1][0].operationId).toBe(api.closeInventoryItem.mock.calls[0][0].operationId);
    expect(await screen.findByText('"לימון" סומן כנגמר')).toBeInTheDocument();
  });

  it('a concurrent close by someone else is explained, not reported as success', async () => {
    as('staff');
    api.closeInventoryItem.mockRejectedValue(Object.assign(new Error('x'), { code: 'already-closed' }));
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar')]);
    await userEvent.click(await screen.findByRole('button', { name: /עדכן סטטוס/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'סמן כנגמר' }));
    expect(await within(dialog).findByText(/כבר סומן כנגמר או כנזרק על ידי פעולה אחרת/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'סמן כנגמר' })).not.toBeInTheDocument();
    expect(screen.queryByText(/"לימון" סומן/)).not.toBeInTheDocument();
  });

  it('badges items with pending or failed queued operations', async () => {
    as('staff');
    offline.operations = [
      { operationId: 'o1', itemId: '1', state: 'pending' },
      { operationId: 'o2', itemId: '2', state: 'failed' },
      { operationId: 'o3', itemId: '3', state: 'synced' },
    ];
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar'), mk('2', 'נענע', 'bar'), mk('3', 'ליים', 'bar')]);
    expect(await screen.findByText('ממתין לשליחה')).toBeInTheDocument();
    expect(screen.getByText('הפעולה נכשלה')).toBeInTheDocument();
    expect(screen.getAllByText(/ממתין לשליחה|הפעולה נכשלה/)).toHaveLength(2);
  });

  it('closing offline is allowed and a pending receipt is reported as not yet saved', async () => {
    as('staff');
    api.closeInventoryItem.mockResolvedValue({ operationId: 'x', itemId: '1', state: 'pending' });
    render(<ItemsList areaFilter="bar" isOffline />);
    push([mk('1', 'לימון', 'bar')]);
    await userEvent.click(await screen.findByRole('button', { name: /עדכן סטטוס/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'סמן כנגמר' }));
    expect(await screen.findByText('העדכון של "לימון" ממתין לשליחה לשרת ועדיין לא נשמר')).toBeInTheDocument();
  });

  it('off-shift staff cannot open the action dialog', async () => {
    as('staff', false);
    render(<ItemsList areaFilter="bar" />);
    push([mk('1', 'לימון', 'bar')]);
    expect(await screen.findByRole('button', { name: /עדכן סטטוס/ })).toBeDisabled();
    expect(screen.getByText(/יש להתחיל משמרת/)).toBeInTheDocument();
  });

  it('shows load errors in Hebrew', async () => {
    as('staff');
    render(<ItemsList areaFilter="bar" />);
    act(() => api.onError!(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })));
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
  });
});
