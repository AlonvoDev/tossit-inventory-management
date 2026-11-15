import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryItemCard } from './InventoryItemCard';

const LONG = 'רוטב פסיפלורה ביתי עם וניל ומעט צ׳ילי לקוקטיילים של הערב';

describe('InventoryItemCard', () => {
  it('shows a long name, decimal kg, no invented fridge, text status and a labelled action', async () => {
    const onAction = vi.fn();
    render(
      <InventoryItemCard
        name={LONG}
        status="expiring"
        quantity="1.25 ק״ג"
        expiry="16.11, 01:30"
        expiryRelative="בעוד 10 שעות"
        opened="15.11, 12:00"
        onAction={onAction}
      />,
    );
    const card = screen.getByRole('article', { name: `${LONG}, עומד לפוג` });
    expect(card).toHaveTextContent('1.25 ק״ג');
    expect(card).toHaveTextContent('בעוד 10 שעות');
    expect(screen.getByText('עומד לפוג')).toBeInTheDocument(); // text, not colour alone
    expect(card).not.toHaveTextContent('מקרר'); // no invented fridge when there is none
    expect(screen.getByText('16.11, 01:30')).toHaveAttribute('dir', 'ltr'); // dates keep their order in RTL
    await userEvent.click(screen.getByRole('button', { name: `נגמר / נזרק — ${LONG}` }));
    expect(onAction).toHaveBeenCalled();
  });

  it('closed items show details and no action', () => {
    render(<InventoryItemCard name="נענע" status="discarded" quantity="0.3 ק״ג" expiry="16.11, 01:30" opened="12.11, 10:00" details={['נזרק: 0.3 ק״ג · פג תוקף']} />);
    expect(screen.getByText('נזרק: 0.3 ק״ג · פג תוקף')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows queued sync state alongside expiry status', () => {
    render(<InventoryItemCard name="שמנת" status="expired" quantity="2 יח׳" expiry="14.11, 15:54" opened="9.11, 15:54" sync="pending" onAction={() => {}} />);
    expect(screen.getByText('פג תוקף')).toBeInTheDocument();
    expect(screen.getByText('ממתין לשליחה')).toBeInTheDocument();
  });
});
