import { describe, it, expect } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  it('describes exactly what is kept offline and never claims syncing', async () => {
    render(<OfflineIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/פתיחה וסגירה של פריטים נשמרות במכשיר/)).toBeInTheDocument();
    expect(screen.getByText(/שינויים אחרים דורשים חיבור/)).toBeInTheDocument();
    expect(screen.queryByText(/סונכרן|יסונכרנו/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByText('החיבור חזר')).toBeInTheDocument();
    expect(screen.queryByText(/מסנכרן/)).not.toBeInTheDocument();
  });

  it('V1: the offline notice can be dismissed (Hebrew label) and sits below dialogs', async () => {
    render(<OfflineIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    const alert = await screen.findByText(/פתיחה וסגירה של פריטים נשמרות במכשיר/);
    const snackbar = alert.closest('.MuiSnackbar-root') as HTMLElement;
    expect(Number(getComputedStyle(snackbar).zIndex)).toBeLessThan(1300); // MUI modal layer
    await userEvent.click(screen.getByRole('button', { name: 'סגירת ההודעה' }));
    await waitFor(() => expect(screen.queryByText(/פתיחה וסגירה של פריטים נשמרות במכשיר/)).not.toBeInTheDocument());
  });
});
