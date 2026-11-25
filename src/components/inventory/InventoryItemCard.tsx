import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  ErrorOutline as ExpiredIcon,
  Schedule as ExpiringIcon,
  CheckCircleOutline as OkIcon,
  TaskAlt as FinishedIcon,
  DeleteOutline as DiscardedIcon,
  CloudUpload as PendingIcon,
  SyncProblem as FailedIcon,
} from '@mui/icons-material';
import type { DisplayStatus } from '../../features/presentation/inventoryDisplay';
import { STATUS_LABEL } from '../../features/presentation/inventoryDisplay';
import { tokens } from '../../app/theme';

/** Text + icon + colour for each status (never colour alone). Colours are appearance-aware tokens. */
const STATUS_STYLE: Record<DisplayStatus, { icon: React.ReactElement; fg: string; stripe: string }> = {
  expired: { icon: <ExpiredIcon sx={{ fontSize: 16 }} />, fg: tokens.colors.danger, stripe: tokens.colors.danger },
  expiring: { icon: <ExpiringIcon sx={{ fontSize: 16 }} />, fg: tokens.colors.warning, stripe: tokens.colors.warningStripe },
  ok: { icon: <OkIcon sx={{ fontSize: 16 }} />, fg: tokens.colors.text.muted, stripe: 'transparent' },
  finished: { icon: <FinishedIcon sx={{ fontSize: 16 }} />, fg: tokens.colors.info, stripe: 'transparent' },
  discarded: { icon: <DiscardedIcon sx={{ fontSize: 16 }} />, fg: tokens.colors.text.muted, stripe: 'transparent' },
};

/** Table column template, shared with the list's column header row. */
export const INVENTORY_ROW_COLUMNS = 'minmax(200px, 2.2fr) minmax(70px, 0.7fr) minmax(110px, 1.1fr) minmax(100px, 1fr) minmax(120px, 1.1fr) minmax(100px, 1fr) 132px';
/** Minimum list width for the table layout (V1-R1): 832px of columns + 6×12px gaps + 32px padding, rounded up. */
export const INVENTORY_TABLE_MIN_WIDTH = 960;

export type InventoryRowLayout = 'stacked' | 'table';

export interface InventoryItemCardProps {
  name: string;
  status: DisplayStatus;
  /** Already formatted, e.g. "0.5 ק״ג". */
  quantity: string;
  expiry: string;
  /** e.g. "בעוד 10 שעות"; omitted for closed items. */
  expiryRelative?: string;
  opened: string;
  fridgeName?: string;
  /** Shown only when items from several departments are listed together (admin combined scope). */
  departmentName?: string;
  sync?: 'pending' | 'failed';
  /** Closed-item details lines, e.g. "נזרק: 0.3 ק״ג · פג תוקף". */
  details?: string[];
  onAction?: () => void;
  actionDisabled?: boolean;
  actionHint?: string;
  /**
   * 'table' only when the list itself is wide enough (measured by the list, not the viewport; V1-R1).
   * Default 'stacked' is the phone layout and fits any width.
   */
  layout?: InventoryRowLayout;
}

const Ltr: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box component="span" dir="ltr" sx={{ unicodeBidi: 'isolate', whiteSpace: 'nowrap' }}>
    {children}
  </Box>
);

const Sep = () => (
  <Box component="span" aria-hidden sx={{ color: 'text.disabled' }}>
    ·
  </Box>
);

/**
 * One inventory batch as a flat list row (V1). Stacked: three compact lines with the remaining time
 * and the action at the end. Table: every cell has an explicit column on row 1; closure details and
 * sync state are full-width secondary rows after the main cells (V1-R2), so dates never move.
 */
export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  name,
  status,
  quantity,
  expiry,
  expiryRelative,
  opened,
  fridgeName,
  departmentName,
  sync,
  details,
  onAction,
  actionDisabled,
  actionHint,
  layout = 'stacked',
}) => {
  const style = STATUS_STYLE[status];
  const urgent = status === 'expired' || status === 'expiring';
  const table = layout === 'table';

  const nameCell = (
    <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, overflowWrap: 'anywhere', minWidth: 0 }}>
      {name}
      {departmentName && (
        <Box
          component="span"
          data-testid="department"
          sx={{ display: 'inline-block', marginInlineStart: '6px', px: 0.6, border: 1, borderColor: tokens.colors.lineStrong, borderRadius: 1, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', verticalAlign: '2px', lineHeight: 1.5 }}
        >
          {departmentName}
        </Box>
      )}
    </Typography>
  );
  const quantityText = (
    // Number + Hebrew unit read naturally in RTL; only dates/times need an LTR span.
    <Typography component="span" sx={{ fontWeight: 700, fontSize: table ? '0.95rem' : '0.9rem', color: 'text.primary', unicodeBidi: 'plaintext' }}>
      {quantity}
    </Typography>
  );
  const whenCell = (
    <Box sx={{ textAlign: table ? 'start' : 'left', minWidth: 0 }}>
      {expiryRelative && (
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, color: urgent ? style.fg : 'text.primary', whiteSpace: 'nowrap' }}>
          {expiryRelative}
        </Typography>
      )}
      <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: '0.8125rem', fontWeight: 700, color: style.fg, whiteSpace: 'nowrap' }}>
        {style.icon}
        {STATUS_LABEL[status]}
      </Typography>
    </Box>
  );
  const actionCell = onAction && (
    <Button
      variant="outlined"
      onClick={onAction}
      disabled={actionDisabled}
      title={actionHint}
      aria-label={`נגמר / נזרק — ${name}`}
      sx={{ minHeight: 44, px: 1.25, fontSize: '0.875rem', whiteSpace: 'nowrap', borderColor: tokens.colors.lineStrong, color: 'primary.main' }}
    >
      נגמר / נזרק
    </Button>
  );
  const detailLines = details && details.length > 0 && (
    <Box data-testid="row-details" sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, fontSize: '0.8125rem', color: 'text.secondary' }}>
      {details.map(line => (
        <Typography key={line} component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          {line}
        </Typography>
      ))}
    </Box>
  );
  const syncLine = sync && (
    <Typography
      title={sync === 'pending' ? 'נשמר במכשיר, עדיין לא נשמר בשרת' : 'השרת דחה את הפעולה; פרטים בכותרת'}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8125rem', fontWeight: 600, color: sync === 'pending' ? 'text.secondary' : 'error.main' }}
    >
      {sync === 'pending' ? <PendingIcon sx={{ fontSize: 16 }} /> : <FailedIcon sx={{ fontSize: 16 }} />}
      {sync === 'pending' ? 'ממתין לשליחה' : 'הפעולה נכשלה'}
      <Box component="span" sx={{ fontWeight: 400 }}>
        {sync === 'pending' ? '— נשמר במכשיר, עדיין לא בשרת' : '— לא נשמר בשרת'}
      </Box>
    </Typography>
  );

  const shell = {
    position: 'relative',
    display: 'grid',
    alignItems: 'center',
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    // Thin status stripe on the reading-start edge; meaning is also given in text.
    '&::before': {
      content: '""',
      position: 'absolute',
      insetInlineStart: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 2,
      bgcolor: style.stripe,
    },
  } as const;

  if (table) {
    // Explicit row/column for every cell (V1-R2): secondary rows can never displace the date columns.
    const cell = (column: number) => ({ gridRow: 1, gridColumn: column, minWidth: 0 });
    return (
      <Box
        component="article"
        aria-label={`${name}, ${STATUS_LABEL[status]}`}
        data-layout="table"
        sx={{ ...shell, gridTemplateColumns: INVENTORY_ROW_COLUMNS, columnGap: 1.5, rowGap: 0.5, px: 2, py: 1, minHeight: 56 }}
      >
        <Box sx={cell(1)}>{nameCell}</Box>
        <Box sx={cell(2)}>{quantityText}</Box>
        <Box sx={cell(3)} data-cell="fridge">
          <Typography component="span" sx={{ fontSize: '0.95rem' }}>{fridgeName ?? ''}</Typography>
        </Box>
        <Box sx={cell(4)} data-cell="opened">
          <Typography component="span" sx={{ fontSize: '0.95rem' }}><Ltr>{opened}</Ltr></Typography>
        </Box>
        <Box sx={cell(5)} data-cell="remaining">{whenCell}</Box>
        <Box sx={cell(6)} data-cell="expiry">
          <Typography component="span" sx={{ fontSize: '0.95rem' }}><Ltr>{expiry}</Ltr></Typography>
        </Box>
        <Box sx={{ ...cell(7), justifySelf: 'end' }}>{actionCell}</Box>
        {detailLines && <Box sx={{ gridRow: 2, gridColumn: '1 / -1' }}>{detailLines}</Box>}
        {syncLine && <Box sx={{ gridRow: detailLines ? 3 : 2, gridColumn: '1 / -1' }}>{syncLine}</Box>}
      </Box>
    );
  }

  return (
    <Box
      component="article"
      aria-label={`${name}, ${STATUS_LABEL[status]}`}
      data-layout="stacked"
      sx={{
        ...shell,
        columnGap: 1.25,
        rowGap: 0.25,
        gridTemplateColumns: onAction ? 'minmax(0, 1fr) auto auto' : 'minmax(0, 1fr) auto',
        gridTemplateAreas: onAction ? '"name when act" "meta when act" "times times act"' : '"name when" "meta when" "times times"',
        px: 1.5,
        py: 1.25,
      }}
    >
      <Box sx={{ gridArea: 'name', minWidth: 0 }}>{nameCell}</Box>
      <Box sx={{ gridArea: 'meta', display: 'flex', flexWrap: 'wrap', columnGap: 0.75, fontSize: '0.875rem', color: 'text.secondary', minWidth: 0 }}>
        {quantityText}
        {fridgeName && (
          <>
            <Sep />
            <Typography component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{fridgeName}</Typography>
          </>
        )}
      </Box>
      <Box sx={{ gridArea: 'times', display: 'flex', flexWrap: 'wrap', columnGap: 0.75, fontSize: '0.8125rem', color: 'text.secondary' }}>
        <Typography component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          נפתח: <Ltr>{opened}</Ltr>
        </Typography>
        <Sep />
        <Typography component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          תוקף: <Ltr>{expiry}</Ltr>
        </Typography>
      </Box>
      <Box sx={{ gridArea: 'when' }}>{whenCell}</Box>
      {actionCell && <Box sx={{ gridArea: 'act', justifySelf: 'end' }}>{actionCell}</Box>}
      {detailLines && <Box sx={{ gridColumn: '1 / -1', mt: 0.25 }}>{detailLines}</Box>}
      {syncLine && <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>{syncLine}</Box>}
    </Box>
  );
};
