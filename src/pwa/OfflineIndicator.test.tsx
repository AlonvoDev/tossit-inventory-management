import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
});
