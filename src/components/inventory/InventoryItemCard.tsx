import React from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
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

/** Text + icon + colour for each status (never colour alone). */
const STATUS_STYLE: Record<DisplayStatus, { icon: React.ReactElement; fg: string; bg: string; edge: string }> = {
  expired: { icon: <ExpiredIcon fontSize="small" />, fg: '#9F1239', bg: '#FFE4E6', edge: '#E11D48' },
  expiring: { icon: <ExpiringIcon fontSize="small" />, fg: '#7C2D12', bg: '#FFEDD5', edge: '#EA580C' },
  ok: { icon: <OkIcon fontSize="small" />, fg: '#14532D', bg: '#DCFCE7', edge: '#16A34A' },
  finished: { icon: <FinishedIcon fontSize="small" />, fg: '#1E3A8A', bg: '#DBEAFE', edge: '#2563EB' },
  discarded: { icon: <DiscardedIcon fontSize="small" />, fg: '#374151', bg: '#E5E7EB', edge: '#6B7280' },
};

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

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  name,
  status,
  quantity,
  expiry,
  expiryRelative,
  opened,
  fridgeName,
  sync,
  details,
  onAction,
  actionDisabled,
  actionHint,
}) => {
  const style = STATUS_STYLE[status];
  const urgent = status === 'expired';
  return (
    <Paper
      component="article"
      variant="outlined"
      aria-label={`${name}, ${STATUS_LABEL[status]}`}
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        borderRadius: 2,
        borderInlineStartWidth: 4,
        borderInlineStartColor: style.edge,
        bgcolor: urgent ? '#FFF7F8' : 'background.paper',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, justifyContent: 'space-between' }}>
        <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.35, overflowWrap: 'anywhere', minWidth: 0 }}>
          {name}
        </Typography>
        <Chip
          size="small"
          icon={style.icon}
          label={STATUS_LABEL[status]}
          sx={{ flexShrink: 0, fontWeight: 700, color: style.fg, bgcolor: style.bg, '& .MuiChip-icon': { color: style.fg } }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        {/* Number + Hebrew unit read naturally in RTL; only dates/times need an LTR span. */}
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', unicodeBidi: 'plaintext' }}>{quantity}</Typography>
        {fridgeName && (
          <Typography variant="body2" color="text.secondary">
            · {fridgeName}
          </Typography>
        )}
      </Box>

      <Box>
        <Typography sx={{ fontSize: '0.9rem', color: urgent ? style.fg : 'text.primary', fontWeight: urgent ? 700 : 500 }}>
          תוקף: <Ltr>{expiry}</Ltr>
          {expiryRelative && <> · {expiryRelative}</>}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          נפתח: <Ltr>{opened}</Ltr>
        </Typography>
        {details?.map(line => (
          <Typography key={line} variant="body2" sx={{ fontSize: '0.8rem' }}>
            {line}
          </Typography>
        ))}
      </Box>

      {sync && (
        <Chip
          size="small"
          variant="outlined"
          icon={sync === 'pending' ? <PendingIcon fontSize="small" /> : <FailedIcon fontSize="small" />}
          label={sync === 'pending' ? 'ממתין לשליחה' : 'הפעולה נכשלה'}
          title={sync === 'pending' ? 'נשמר במכשיר, עדיין לא נשמר בשרת' : 'השרת דחה את הפעולה; פרטים בכותרת'}
          color={sync === 'pending' ? 'info' : 'error'}
          sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
        />
      )}

      {onAction && (
        <Button
          variant={urgent ? 'contained' : 'outlined'}
          color={urgent ? 'error' : 'primary'}
          onClick={onAction}
          disabled={actionDisabled}
          title={actionHint}
          aria-label={`נגמר / נזרק — ${name}`}
          sx={{ minHeight: 44, mt: 'auto' }}
          fullWidth
        >
          נגמר / נזרק
        </Button>
      )}
    </Paper>
  );
};
