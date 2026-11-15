import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemActionModal } from './ItemActionModal';

const base = { open: true, onClose: vi.fn(), itemName: 'נענע', itemAmount: 0.5, itemType: 'kg' as const };

describe('ItemActionModal', () => {
  it('is a labelled dialog whose choices are large touch targets', () => {
    render(<ItemActionModal {...base} onConfirm={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /עדכון מצב פריט/ })).toBeInTheDocument();
    for (const name of [/^נגמר/, /^נזרק/]) {
      const label = screen.getByRole('radio', { name }).closest('label') as HTMLElement;
      expect(getComputedStyle(label).minHeight).toBe('56px');
    }
  });

  it('requires a reason and amount for discard and confirms with exact values', async () => {
    const onConfirm = vi.fn();
    render(<ItemActionModal {...base} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('radio', { name: /^נזרק/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'כמות שנזרקה' }), { target: { value: '0.3' } });
    await userEvent.click(screen.getByRole('button', { name: 'סמן כנזרק' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('יש לבחור סיבת זריקה')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'נפגם' }));
    await userEvent.click(screen.getByRole('button', { name: 'סמן כנזרק' }));
    expect(onConfirm).toHaveBeenCalledWith({ action: 'discarded', discardedAmount: 0.3, reason: 'damaged' });
  });

  it('blocks closing and repeated confirmation while sending', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<ItemActionModal {...base} onClose={onClose} onConfirm={onConfirm} loading />);
    expect(screen.getByRole('button', { name: /שולח/ })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
