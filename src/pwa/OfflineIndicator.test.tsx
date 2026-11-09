import { describe, it, expect } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  it('does not promise local saving or syncing', async () => {
    render(<OfflineIndicator />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/פעולות שדורשות שרת לא יישמרו/)).toBeInTheDocument();
    expect(screen.queryByText(/יסונכרנו|נשמר מקומית|יישמרו מקומית/)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByText('החיבור חזר')).toBeInTheDocument();
    expect(screen.queryByText(/מסנכרן/)).not.toBeInTheDocument();
  });
});
