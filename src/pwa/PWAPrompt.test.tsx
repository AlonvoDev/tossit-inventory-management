import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PWAPrompt } from './PWAPrompt';
import { resetUpdateStore, setUpdateAvailable } from './updateStore';

describe('PWAPrompt controlled updates', () => {
  beforeEach(() => resetUpdateStore());

  it('shows nothing and never asks for notification permission on load', () => {
    const request = vi.fn();
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: request });
    render(<PWAPrompt />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps an update that arrived before mount and applies it only on user action', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    setUpdateAvailable(apply);
    render(<PWAPrompt />);
    expect(screen.getByText('גרסה חדשה זמינה', { selector: 'h2' })).toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'עדכן עכשיו' }));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('"later" keeps the update reachable from a banner', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    render(<PWAPrompt />);
    act(() => setUpdateAvailable(apply));
    await userEvent.click(screen.getByRole('button', { name: 'מאוחר יותר' }));
    expect(apply).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'עדכן' }));
    expect(await screen.findByRole('button', { name: 'עדכן עכשיו' })).toBeInTheDocument();
  });

  it('reports a failed update instead of pretending it worked', async () => {
    setUpdateAvailable(vi.fn().mockRejectedValue(new Error('boom')));
    render(<PWAPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'עדכן עכשיו' }));
    expect(await screen.findByText(/העדכון נכשל/)).toBeInTheDocument();
  });
});
