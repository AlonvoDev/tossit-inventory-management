import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ profile: { uid: 'u' }, user: { uid: 'u' }, isOffline: false }) }));
vi.mock('./OpenItemForm', () => ({ default: () => <form aria-label="פתיחת פריט"><input aria-label="כמות" /></form> }));

import FloatingActionButton from './FloatingActionButton';

describe('FloatingActionButton (inline)', () => {
  it('opens a labelled dialog with the title once and restores focus to the opener on Escape', async () => {
    render(<FloatingActionButton variant="inline" department="bar" onItemAdded={() => {}} />);
    const opener = screen.getByRole('button', { name: 'פתיחת פריט' });
    await userEvent.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'פתיחת פריט — בר' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('פתיחת פריט — בר')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); // after the exit transition
    expect(opener).toHaveFocus();
  });

  it('closes from the labelled close button', async () => {
    render(<FloatingActionButton variant="inline" department="bar" onItemAdded={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'פתיחת פריט' }));
    await userEvent.click(await screen.findByRole('button', { name: 'סגירה' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
