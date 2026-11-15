// UI3-R2: the phone branch of the discard report (useMediaQuery forced to "phone").
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DiscardReportItem } from '../api/firestoreAPI';

vi.mock('@mui/material', async importOriginal => ({
  ...(await importOriginal<typeof import('@mui/material')>()),
  useMediaQuery: () => true,
}));
const getDiscardReport = vi.fn<(...args: unknown[]) => Promise<DiscardReportItem[]>>();
vi.mock('../api/firestoreAPI', () => ({ getDiscardReport: (...args: unknown[]) => getDiscardReport(...args) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ businessId: 'synthetic-business' }) }));

import DiscardReport from './DiscardReport';

const rows: DiscardReportItem[] = [
  { productName: 'חלב לבדיקה', totalQuantity: 2.5, discardCount: 2, averageQuantity: 1.25, reasons: { expired: 1, damaged: 1, other: 0 }, lastDiscarded: new Date(2026, 10, 10), type: 'kg' },
  { productName: 'אבוקדו', totalQuantity: 6, discardCount: 1, averageQuantity: 6, reasons: { expired: 1, damaged: 0, other: 0 }, lastDiscarded: new Date(2026, 10, 14), type: 'units' },
  { productName: 'תפוז', totalQuantity: 1, discardCount: 4, averageQuantity: 0.25, reasons: { expired: 0, damaged: 0, other: 4 }, lastDiscarded: new Date(2026, 10, 1), type: 'kg' },
];

const order = () => screen.getAllByRole('article').map(a => within(a).getByRole('heading').textContent);

const chooseSort = async (label: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: 'מיון לפי' }));
  await userEvent.click(await screen.findByRole('option', { name: label }));
};

describe('DiscardReport on phones (UI3-R2)', () => {
  beforeEach(() => getDiscardReport.mockReset().mockResolvedValue(rows));

  it('shows the per-product average with its unit on each card, without mixing units', async () => {
    render(<DiscardReport businessId="synthetic-business" />);
    const milk = (await screen.findByText('חלב לבדיקה')).closest('article') as HTMLElement;
    expect(within(milk).getByText(/ממוצע לזריקה: 1.25 ק״ג/)).toBeInTheDocument();
    const avocado = screen.getByText('אבוקדו').closest('article') as HTMLElement;
    expect(within(avocado).getByText(/ממוצע לזריקה: 6 יח׳/)).toBeInTheDocument();
    expect(screen.getByText('נזרק בק״ג').parentElement).toHaveTextContent('3.5');
    expect(screen.getByText('נזרק ביחידות').parentElement).toHaveTextContent('6');
  });

  it('sorts by every existing key in both directions', async () => {
    render(<DiscardReport businessId="synthetic-business" />);
    await screen.findByText('חלב לבדיקה');
    // default: total quantity, descending (as on desktop)
    expect(order()).toEqual(['אבוקדו', 'חלב לבדיקה', 'תפוז']);
    const direction = screen.getByRole('button', { name: /כיוון מיון/ });
    expect(direction).toHaveAccessibleName('כיוון מיון: יורד');
    await userEvent.click(direction);
    expect(direction).toHaveAccessibleName('כיוון מיון: עולה');
    expect(order()).toEqual(['תפוז', 'חלב לבדיקה', 'אבוקדו']);

    const cases = [
      { label: 'כמות כוללת נזרקת', ascending: ['תפוז', 'חלב לבדיקה', 'אבוקדו'] },
      { label: 'מספר זריקות', ascending: ['אבוקדו', 'חלב לבדיקה', 'תפוז'] },
      { label: 'זריקה אחרונה', ascending: ['תפוז', 'חלב לבדיקה', 'אבוקדו'] },
      { label: 'ממוצע לזריקה', ascending: ['תפוז', 'חלב לבדיקה', 'אבוקדו'] },
      { label: 'שם המוצר', ascending: ['אבוקדו', 'חלב לבדיקה', 'תפוז'] },
    ];
    for (const { label, ascending } of cases) {
      await chooseSort(label);
      if (direction.getAttribute('aria-label') === 'כיוון מיון: יורד') await userEvent.click(direction);
      expect(direction).toHaveAccessibleName('כיוון מיון: עולה');
      expect(order()).toEqual(ascending);
      await userEvent.click(direction);
      expect(direction).toHaveAccessibleName('כיוון מיון: יורד');
      expect(order()).toEqual([...ascending].reverse());
    }
  });

  it('keeps sorting together with search and the reason filter', async () => {
    render(<DiscardReport businessId="synthetic-business" />);
    await screen.findByText('חלב לבדיקה');
    await chooseSort('מספר זריקות');
    fireEvent.change(screen.getByRole('textbox', { name: 'חיפוש מוצר' }), { target: { value: 'ת' } });
    expect(order()).toEqual(['תפוז']);
    fireEvent.change(screen.getByRole('textbox', { name: 'חיפוש מוצר' }), { target: { value: '' } });
    await userEvent.click(screen.getByRole('combobox', { name: 'סיבת זריקה' }));
    await userEvent.click(await screen.findByRole('option', { name: 'נפגם' }));
    await waitFor(() => expect(getDiscardReport).toHaveBeenLastCalledWith('synthetic-business', undefined, undefined, 'damaged'));
    expect(screen.getByRole('combobox', { name: 'מיון לפי' })).toHaveTextContent('מספר זריקות');
  });

  it('average keeps whole numbers intact and shows fractional unit averages', async () => {
    getDiscardReport.mockResolvedValueOnce([
      { productName: 'בקבוק', totalQuantity: 120, discardCount: 2, averageQuantity: 60, reasons: { expired: 2, damaged: 0, other: 0 }, type: 'units' },
      { productName: 'ביצה', totalQuantity: 6, discardCount: 4, averageQuantity: 1.5, reasons: { expired: 4, damaged: 0, other: 0 }, type: 'units' },
    ]);
    render(<DiscardReport businessId="synthetic-business" />);
    expect(within((await screen.findByText('בקבוק')).closest('article') as HTMLElement).getByText(/ממוצע לזריקה: 60 יח׳/)).toBeInTheDocument();
    expect(within(screen.getByText('ביצה').closest('article') as HTMLElement).getByText(/ממוצע לזריקה: 1.5 יח׳/)).toBeInTheDocument();
  });

  it('sort controls meet 44px and one-row / empty reports still render', async () => {
    getDiscardReport.mockResolvedValueOnce([rows[0]]).mockResolvedValueOnce([]);
    const { unmount } = render(<DiscardReport businessId="synthetic-business" />);
    await screen.findByText('חלב לבדיקה');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    const select = screen.getByRole('combobox', { name: 'מיון לפי' }).closest('.MuiInputBase-root') as HTMLElement;
    expect(getComputedStyle(select).minHeight).toBe('44px');
    expect(getComputedStyle(screen.getByRole('button', { name: /כיוון מיון/ })).minHeight).toBe('44px');
    unmount();
    render(<DiscardReport businessId="synthetic-business" />);
    expect(await screen.findByText('אין נתונים להצגה')).toBeInTheDocument();
  });
});
