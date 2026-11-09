import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const shift = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/ShiftContext', () => ({ useShift: () => shift.current }));
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.current }));

import ShiftButton from './ShiftButton';

const ts = (ms: number) => ({ toDate: () => new Date(ms) });

describe('ShiftButton', () => {
  beforeEach(() => {
    auth.current = { isOffline: false };
    shift.current = { isOnShift: false, shiftStartedAt: null, startUserShift: vi.fn(), endUserShift: vi.fn(), isLoading: false, error: null };
  });

  it('starts a shift', async () => {
    render(<ShiftButton />);
    await userEvent.click(screen.getByRole('button', { name: 'התחלת משמרת' }));
    expect(shift.current.startUserShift).toHaveBeenCalled();
  });

  it('asks before ending and does nothing when cancelled', async () => {
    shift.current = { ...shift.current, isOnShift: true, shiftStartedAt: ts(Date.UTC(2026, 10, 9, 18, 30)) };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ShiftButton />);
    expect(screen.getByRole('status')).toHaveTextContent('20:30'); // Asia/Jerusalem (UTC+2 in November)
    await userEvent.click(screen.getByRole('button', { name: 'סיום משמרת' }));
    expect(shift.current.endUserShift).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'סיום משמרת' }));
    expect(shift.current.endUserShift).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('is disabled offline and shows errors from the shift operation', () => {
    auth.current = { isOffline: true };
    shift.current = { ...shift.current, error: 'עדכון המשמרת נכשל. נסה שוב.' };
    render(<ShiftButton />);
    expect(screen.getByRole('button', { name: 'התחלת משמרת' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('עדכון המשמרת נכשל');
  });
});
