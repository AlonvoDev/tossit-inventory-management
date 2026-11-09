// Run in the business timezone: UTC parsing of "YYYY-MM-DD" shifts days here, UTC hides it.
const originalTZ = process.env.TZ;
process.env.TZ = 'Asia/Jerusalem';

import { afterAll, describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DiscardReportItem } from '../api/firestoreAPI';

const getDiscardReport = vi.fn<(...args: unknown[]) => Promise<DiscardReportItem[]>>();
vi.mock('../api/firestoreAPI', () => ({
  getDiscardReport: (...args: unknown[]) => getDiscardReport(...args),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ businessId: 'b1' }) }));

import DiscardReport from './DiscardReport';

const rows: DiscardReportItem[] = [
  {
    productName: 'חלב',
    totalQuantity: 2.5,
    discardCount: 2,
    reasons: { expired: 1, damaged: 1, other: 0 },
    averageQuantity: 1.25,
    lastDiscarded: new Date(2026, 10, 8),
    type: 'kg',
  },
  {
    productName: 'לימון',
    totalQuantity: 4,
    discardCount: 1,
    reasons: { expired: 0, damaged: 0, other: 1 },
    averageQuantity: 4,
    type: 'units',
  },
];

describe('DiscardReport', () => {
  beforeEach(() => {
    getDiscardReport.mockReset();
  });

  it('loads the whole business without date bounds and shows reason breakdown', async () => {
    getDiscardReport.mockResolvedValue(rows);
    render(<DiscardReport businessId="b1" />);
    expect(await screen.findByText('חלב')).toBeInTheDocument();
    expect(getDiscardReport).toHaveBeenCalledWith('b1', undefined, undefined);
    expect(screen.getByText('פג תוקף: 1')).toBeInTheDocument();
    expect(screen.getByText('נפגם: 1')).toBeInTheDocument();
    expect(screen.getByText('אחר: 1')).toBeInTheDocument();
    // decimal kg preserved, units shown as integers
    expect(screen.getByText('2.5')).toBeInTheDocument();
  });

  it('applies a typed date range as inclusive whole local days', async () => {
    getDiscardReport.mockResolvedValue(rows);
    render(<DiscardReport businessId="b1" />);
    await screen.findByText('חלב');

    await userEvent.click(screen.getByRole('button', { name: /בחר טווח תאריכים/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('תאריך התחלה'), { target: { value: '2026-11-01' } });
    fireEvent.change(within(dialog).getByLabelText('תאריך סיום'), { target: { value: '2026-11-09' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'החל' }));

    await waitFor(() => expect(getDiscardReport).toHaveBeenCalledTimes(2));
    const [, start, end] = getDiscardReport.mock.calls[1];
    expect(start).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 9, 23, 59, 59, 999));
  });

  it('blocks applying a range whose end is before its start', async () => {
    getDiscardReport.mockResolvedValue(rows);
    render(<DiscardReport businessId="b1" />);
    await screen.findByText('חלב');

    await userEvent.click(screen.getByRole('button', { name: /בחר טווח תאריכים/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('תאריך התחלה'), { target: { value: '2026-11-09' } });
    fireEvent.change(within(dialog).getByLabelText('תאריך סיום'), { target: { value: '2026-11-01' } });
    expect(within(dialog).getByText('תאריך הסיום לפני תאריך ההתחלה')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'החל' })).toBeDisabled();
  });

  it('shows a filter-specific empty state', async () => {
    getDiscardReport.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);
    render(<DiscardReport businessId="b1" />);
    await screen.findByText('חלב');
    await userEvent.click(screen.getByRole('button', { name: /בחר טווח תאריכים/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /היום/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'החל' }));
    expect(await screen.findByText('לא נמצאו זריקות התואמות לסינון שנבחר')).toBeInTheDocument();
  });

  it('filters totals by reason on the server and keeps same-name kg/unit rows apart', async () => {
    getDiscardReport.mockResolvedValue([
      { ...rows[0], productName: 'לימון', type: 'kg' },
      { ...rows[1], productName: 'לימון', type: 'units' },
    ]);
    render(<DiscardReport businessId="b1" />);
    expect(await screen.findAllByText('לימון')).toHaveLength(2);
    await userEvent.click(screen.getByRole('combobox', { name: 'סיבת זריקה' }));
    await userEvent.click(await screen.findByRole('option', { name: 'נפגם' }));
    await waitFor(() => expect(getDiscardReport).toHaveBeenLastCalledWith('b1', undefined, undefined, 'damaged'));
  });

  it('shows a recoverable error and retries', async () => {
    getDiscardReport.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    getDiscardReport.mockResolvedValueOnce(rows);
    render(<DiscardReport businessId="b1" />);
    expect(await screen.findByText('שגיאה בטעינת הדוח. אנא נסה שוב.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'נסה שוב' }));
    expect(await screen.findByText('חלב')).toBeInTheDocument();
  });
});

afterAll(() => {
  process.env.TZ = originalTZ;
});
