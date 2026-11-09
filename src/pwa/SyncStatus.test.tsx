import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  current: { operations: [] as { operationId: string; itemId: string; state: string; errorCode?: string }[], error: null as string | null, retry: vi.fn() },
}));
vi.mock('../offline/OfflineProvider', () => ({
  useOffline: () => ({
    ...state.current,
    pendingCount: state.current.operations.filter(o => o.state === 'pending').length,
    failedCount: state.current.operations.filter(o => o.state === 'failed').length,
  }),
}));

import { SyncStatus } from './SyncStatus';

describe('SyncStatus', () => {
  beforeEach(() => {
    state.current = { operations: [], error: null, retry: vi.fn().mockResolvedValue(undefined) };
  });

  it('renders nothing when nothing is pending or failed', () => {
    state.current.operations = [{ operationId: 'a', itemId: '1', state: 'synced' }];
    const { container } = render(<SyncStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows pending and failed counts separately', () => {
    state.current.operations = [
      { operationId: 'a', itemId: '1', state: 'pending' },
      { operationId: 'b', itemId: '2', state: 'pending' },
      { operationId: 'c', itemId: '3', state: 'failed', errorCode: 'already-closed' },
    ];
    render(<SyncStatus />);
    expect(screen.getByText('2 ממתינות לשליחה')).toBeInTheDocument();
    expect(screen.getByText('1 נכשלו')).toBeInTheDocument();
  });

  it('lists failures with a Hebrew reason and retries the same operation on request only', async () => {
    state.current.operations = [
      { operationId: 'p', itemId: '1', state: 'pending' },
      { operationId: 'f', itemId: '2', state: 'failed', errorCode: 'catalog-changed' },
    ];
    render(<SyncStatus itemNames={{ '2': 'עוף' }} />);
    await userEvent.click(screen.getByText('1 נכשלו'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('נשמר במכשיר, ממתין לשליחה')).toBeInTheDocument();
    expect(within(dialog).getByText(/נכשל: הגדרות המוצר השתנו/)).toBeInTheDocument();
    expect(state.current.retry).not.toHaveBeenCalled();
    expect(within(dialog).getAllByRole('button', { name: 'נסה שוב' })).toHaveLength(1);
    await userEvent.click(within(dialog).getByRole('button', { name: 'נסה שוב' }));
    expect(state.current.retry).toHaveBeenCalledWith('f');
  });

  it('reports a failed retry without hiding the operation', async () => {
    state.current.operations = [{ operationId: 'f', itemId: '2', state: 'failed', errorCode: 'permission-denied' }];
    state.current.retry = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    render(<SyncStatus />);
    await userEvent.click(screen.getByText('1 נכשלו'));
    await userEvent.click(screen.getByRole('button', { name: 'נסה שוב' }));
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.', { selector: '.MuiAlert-message' })).toBeInTheDocument();
    expect(screen.getByText(/נכשל: אין לך הרשאה/)).toBeInTheDocument();
  });
});
