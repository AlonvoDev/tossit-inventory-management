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

/** Desktop column template, shared with the list's column header row. */
export const INVENTORY_ROW_COLUMNS = 'minmax(200px, 2.2fr) minmax(70px, 0.7fr) minmax(110px, 1.1fr) minmax(100px, 1fr) minmax(120px, 1.1fr) minmax(100px, 1fr) 132px';

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
}

const Ltr: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box component="span" dir="ltr" sx={{ unicodeBidi: 'isolate', whiteSpace: 'nowrap' }}>
    {children}
  </Box>
);

const Sep = () => (
  <Box component="span" aria-hidden sx={{ color: 'text.disabled', display: { md: 'none' } }}>
    ·
  </Box>
);

/**
 * One inventory batch as a flat list row (V1). Phone: three compact lines with the remaining time
 * and the action at the end. Desktop (md+): the same cells align as table columns.
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
}) => {
  const style = STATUS_STYLE[status];
  const urgent = status === 'expired' || status === 'expiring';
  return (
    <Box
      component="article"
      aria-label={`${name}, ${STATUS_LABEL[status]}`}
      sx={{
        position: 'relative',
        display: 'grid',
        alignItems: 'center',
        columnGap: { xs: 1.25, md: 1.5 },
        rowGap: 0.25,
        gridTemplateColumns: { xs: onAction ? 'minmax(0, 1fr) auto auto' : 'minmax(0, 1fr) auto', md: INVENTORY_ROW_COLUMNS },
        gridTemplateAreas: {
          xs: onAction ? '"name when act" "meta when act" "times times act"' : '"name when" "meta when" "times times"',
          md: 'none',
        },
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.25, md: 1 },
        minHeight: { md: 56 },
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
      }}
    >
      <Typography
        component="h3"
        sx={{ gridArea: { xs: 'name', md: 'auto' }, fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, overflowWrap: 'anywhere', minWidth: 0 }}
      >
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

      {/* Phone: one line "qty · fridge"; desktop: two separate cells. */}
      <Box sx={{ gridArea: { xs: 'meta', md: 'auto' }, display: { xs: 'flex', md: 'contents' }, flexWrap: 'wrap', columnGap: 0.75, fontSize: '0.875rem', color: 'text.secondary', minWidth: 0 }}>
        {/* Number + Hebrew unit read naturally in RTL; only dates/times need an LTR span. */}
        <Typography component="span" sx={{ fontWeight: 700, fontSize: { xs: '0.9rem', md: '0.95rem' }, color: 'text.primary', unicodeBidi: 'plaintext' }}>
          {quantity}
        </Typography>
        {fridgeName ? (
          <>
            <Sep />
            <Typography component="span" sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' }, color: { xs: 'text.secondary', md: 'text.primary' } }}>
              {fridgeName}
            </Typography>
          </>
        ) : (
          <Box component="span" sx={{ display: { xs: 'none', md: 'block' } }} />
        )}
      </Box>

      {/* Phone: small third line; desktop: "opened" and "expiry" are columns (expiry after remaining). */}
      <Box sx={{ gridArea: { xs: 'times', md: 'auto' }, display: { xs: 'flex', md: 'contents' }, flexWrap: 'wrap', columnGap: 0.75, fontSize: '0.8125rem', color: 'text.secondary' }}>
        <Typography component="span" sx={{ fontSize: { xs: '0.8125rem', md: '0.95rem' }, color: { xs: 'text.secondary', md: 'text.primary' }, order: { md: 1 } }}>
          <Box component="span" sx={{ display: { md: 'none' } }}>נפתח: </Box>
          <Ltr>{opened}</Ltr>
        </Typography>
        <Sep />
        <Typography component="span" sx={{ fontSize: { xs: '0.8125rem', md: '0.95rem' }, color: { xs: 'text.secondary', md: 'text.primary' }, order: { md: 3 } }}>
          <Box component="span" sx={{ display: { md: 'none' } }}>תוקף: </Box>
          <Ltr>{expiry}</Ltr>
        </Typography>
        {details?.map(line => (
          <Typography key={line} component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary', width: { xs: '100%', md: 'auto' }, gridColumn: { md: '2 / -2' } }}>
            {line}
          </Typography>
        ))}
      </Box>

      <Box sx={{ gridArea: { xs: 'when', md: 'auto' }, order: { md: 2 }, textAlign: { xs: 'left', md: 'start' }, minWidth: 0 }}>
        {expiryRelative && (
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, color: urgent ? style.fg : 'text.primary', whiteSpace: 'nowrap' }}>
            {expiryRelative}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, fontSize: '0.8125rem', fontWeight: 700, color: style.fg, whiteSpace: 'nowrap' }}
        >
          {style.icon}
          {STATUS_LABEL[status]}
        </Typography>
      </Box>

      {onAction && (
        <Box sx={{ gridArea: { xs: 'act', md: 'auto' }, order: { md: 4 }, justifySelf: 'end' }}>
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
        </Box>
      )}

      {sync && (
        <Typography
          title={sync === 'pending' ? 'נשמר במכשיר, עדיין לא נשמר בשרת' : 'השרת דחה את הפעולה; פרטים בכותרת'}
          sx={{
            gridColumn: '1 / -1',
            order: { md: 5 },
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.5,
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: sync === 'pending' ? 'text.secondary' : 'error.main',
          }}
        >
          {sync === 'pending' ? <PendingIcon sx={{ fontSize: 16 }} /> : <FailedIcon sx={{ fontSize: 16 }} />}
          {sync === 'pending' ? 'ממתין לשליחה' : 'הפעולה נכשלה'}
          <Box component="span" sx={{ fontWeight: 400 }}>
            {sync === 'pending' ? '— נשמר במכשיר, עדיין לא בשרת' : '— לא נשמר בשרת'}
          </Box>
        </Typography>
      )}
    </Box>
  );
};
