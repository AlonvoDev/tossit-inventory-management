import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('FloatingActionButton (responsive, V1)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const phone = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));

  it('on phones renders one full-width bar fixed to the bottom that opens the same dialog', async () => {
    phone(true);
    render(<FloatingActionButton variant="responsive" department="bar" onItemAdded={() => {}} />);
    const bar = screen.getByTestId('open-item-bar');
    expect(getComputedStyle(bar).position).toBe('fixed');
    expect(screen.getAllByRole('button', { name: 'פתיחת פריט' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'פתיחת פריט' }));
    expect(await screen.findByRole('dialog', { name: 'פתיחת פריט — בר' })).toBeInTheDocument();
  });

  it('from md up renders the inline header button only', () => {
    phone(false);
    render(<FloatingActionButton variant="responsive" department="bar" onItemAdded={() => {}} />);
    expect(screen.queryByTestId('open-item-bar')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'פתיחת פריט' })).toHaveLength(1);
  });
});
