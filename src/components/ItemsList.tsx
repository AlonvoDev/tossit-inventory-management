import React, { useState, useEffect, useMemo } from 'react';
import { departmentLabel } from '../app/access';
import { Alert, Box, Button, Chip, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { InventoryItemCard } from './inventory/InventoryItemCard';
import {
  displayStatus,
  formatDateTime,
  formatQuantity,
  OPEN_STATUSES,
  relativeExpiry,
  STATUS_LABEL,
  type DisplayStatus,
} from '../features/presentation/inventoryDisplay';
import { shiftBlocksOpening } from '../features/inventory/openItem';
import LoadingSkeleton from './LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { Item, subscribeBusinessItems } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { Fridge } from '../types/Fridge';
import { ItemActionModal, ItemActionConfirm } from './ui/ItemActionModal';
import { useCloseItem } from '../hooks/useItemActions';
import { useOffline } from '../offline/OfflineProvider';
import { selectItems, ListMode } from '../features/inventory/itemSelection';
import { errorMessage } from '../features/common/errorMessage';

interface ItemsListProps {
  areaFilter?: 'bar' | 'kitchen' | 'בר' | 'מטבח';
  showExpiredOnly?: boolean;
  showDiscardedOnly?: boolean; // New prop
  showExpiringsSoon?: boolean; // Items expiring within 3 days
  showActiveOnly?: boolean; // Active items only
  showFinishedOnly?: boolean; // Items that were used up completely
  /** Unused since the list is realtime; kept so existing callers compile. */
  refreshTrigger?: number;
  isOffline?: boolean;
  onItemUpdated?: () => void; // Callback for when items are updated
}

const ItemsList: React.FC<ItemsListProps> = ({ 
  areaFilter, 
  showExpiredOnly = false,
  showDiscardedOnly = false, // New prop
  showExpiringsSoon = false,
  showActiveOnly = false,
  showFinishedOnly = false,
  isOffline = false,
  onItemUpdated
}) => {
  const { businessId, profile, role, isOnShift, loading } = useAuth();
  // Closing follows the same rule as opening: staff need an active shift (C1b `operates`).
  const offShift = shiftBlocksOpening(role, !!isOnShift);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DisplayStatus>('all');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Item action dialog (finished / discarded)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalItem, setActionModalItem] = useState<Item | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const close = useCloseItem();
  // Durable queue state per item (C3): pending and failed are shown, never treated as synced.
  const { operations } = useOffline();
  const syncByItem = useMemo(() => {
    const map: Record<string, 'pending' | 'failed'> = {};
    for (const op of operations) {
      if (op.state === 'failed') map[op.itemId] = 'failed';
      else if (op.state === 'pending' && map[op.itemId] !== 'failed') map[op.itemId] = 'pending';
    }
    return map;
  }, [operations]);
  const isActionLoading = close.submitting;

  // Fridges for filtering and name lookup
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [fridgeMap, setFridgeMap] = useState<{ [id: string]: string }>({});
  const [fridgeFilter, setFridgeFilter] = useState<string>('all');

  const userDepartment = profile?.department;
  const canSeeAllDepartments = role === 'admin';

  const mode: ListMode = showDiscardedOnly
    ? 'discarded'
    : showFinishedOnly
      ? 'finished'
      : showExpiredOnly
        ? 'expired'
        : showExpiringsSoon
          ? 'expiring'
          : showActiveOnly
            ? 'active'
            : 'open';

  // Realtime, server-scoped inventory (C2 subscribeBusinessItems): other devices' opens and
  // closes appear without refreshing. `refreshTrigger` is kept for compatibility only.
  useEffect(() => {
    if (loading || !profile || !businessId) return;
    setIsLoading(true);
    setError(null);
    const unsubscribe = subscribeBusinessItems(
      businessId,
      next => {
        setItems(next);
        setIsLoading(false);
        setError(null);
      },
      err => {
        console.error('Error loading items:', err);
        setError(errorMessage(err, 'טעינת הפריטים נכשלה. נסה שוב.'));
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [businessId, loading, profile]);

  // Expiry state changes with time even without data changes.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    getBusinessFridges(businessId)
      .then(data => {
        if (cancelled) return;
        setFridges(data);
        const map: { [id: string]: string } = {};
        data.forEach(f => {
          if (f.id) map[f.id] = f.name;
        });
        setFridgeMap(map);
      })
      .catch(err => console.error('Error fetching fridges:', err));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    let selected = selectItems(items, { mode, department: areaFilter }, nowMs);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      selected = selected.filter(item => item.productName.toLowerCase().includes(query));
    }
    if (fridgeFilter && fridgeFilter !== 'all') {
      selected = selected.filter(item => item.fridgeId === fridgeFilter);
    }
    setFilteredItems(selected);
  }, [items, mode, areaFilter, nowMs, searchQuery, fridgeFilter]);

  const openActionModal = (item: Item) => {
    close.reset();
    setActionNotice(null);
    setActionModalItem(item);
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionModalItem(null);
    close.reset();
  };

  // Success is reported only for a receipt; the realtime list then reflects the server state.
  const handleActionConfirm = async (input: ItemActionConfirm) => {
    if (!actionModalItem?.id) return;
    const receipt = await close.submit({ itemId: actionModalItem.id, ...input });
    if (!receipt) return; // error shown in the dialog; same intent is reused on retry
    const name = actionModalItem.productName;
    setActionNotice(
      receipt.state === 'synced'
        ? input.action === 'finished'
          ? `"${name}" סומן כנגמר`
          : `"${name}" סומן כנזרק`
        : `העדכון של "${name}" ממתין לשליחה לשרת ועדיין לא נשמר`,
    );
    setShowActionModal(false);
    setActionModalItem(null);
    onItemUpdated?.();
  };

  // Close the dialog if the item disappears or is closed elsewhere while it is open.
  useEffect(() => {
    if (!actionModalItem || isActionLoading) return;
    const current = items.find(i => i.id === actionModalItem.id);
    if (current && (current.finished || current.discarded || current.isThrown) && !close.alreadyClosed) {
      setActionNotice(`"${current.productName}" כבר עודכן ממכשיר אחר`);
      closeActionModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const reasonLabel = (reason: unknown) =>
    reason === 'expired' ? 'פג תוקף' : reason === 'damaged' ? 'נפגם' : 'אחר';

  // Items in this tab before search/fridge/status filters: distinguishes "nothing here" from "no matches".
  const scopeCount = useMemo(
    () => selectItems(items, { mode, department: areaFilter }, nowMs).length,
    [items, mode, areaFilter, nowMs],
  );
  const showStatusFilter = mode === 'open' || mode === 'active';
  // R1: the status filter applies only where its control is shown, and resets when the mode changes,
  // so a choice made in inventory can never hide items in another tab (e.g. "נזרקו").
  const effectiveStatusFilter = showStatusFilter ? statusFilter : 'all';
  useEffect(() => {
    setStatusFilter('all');
  }, [mode]);
  const statusOf = (item: Item) => displayStatus(item, nowMs);
  const statusCounts = useMemo(() => {
    const counts: Record<DisplayStatus, number> = { expired: 0, expiring: 0, ok: 0, finished: 0, discarded: 0 };
    for (const item of filteredItems) counts[displayStatus(item, nowMs)]++;
    return counts;
  }, [filteredItems, nowMs]);
  const visibleItems =
    effectiveStatusFilter === 'all' ? filteredItems : filteredItems.filter(i => statusOf(i) === effectiveStatusFilter);
  const filtersActive = !!searchQuery || fridgeFilter !== 'all' || effectiveStatusFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setFridgeFilter('all');
    setStatusFilter('all');
  };

  const scopeEmptyText =
    mode === 'discarded'
      ? 'אין פריטים שנזרקו'
      : mode === 'finished'
        ? 'אין פריטים שסומנו כנגמרו'
        : mode === 'expired'
          ? 'אין פריטים שפג תוקפם וממתינים לטיפול'
          : mode === 'expiring'
            ? 'אין פריטים שעומדים לפוג בימים הקרובים'
            : 'אין פריטים פתוחים כרגע';
  const scopeLabel = areaFilter
    ? `מחלקת ${departmentLabel(areaFilter) ?? ''}`
    : canSeeAllDepartments
      ? 'כל המחלקות'
      : `מחלקת ${departmentLabel(userDepartment) ?? ''}`;

  // R3: with no department filter an admin sees both departments together; label each card then.
  const combinedScope = !areaFilter && canSeeAllDepartments;

  const cardFor = (item: Item) => {
    const status = statusOf(item);
    const closed = status === 'finished' || status === 'discarded';
    const details: string[] = [];
    if (status === 'discarded') {
      details.push(`נזרק: ${formatQuantity(item.discardedQuantity ?? item.amount, item.type)} · ${reasonLabel(item.discardReason)}`);
      if (item.discardedAt) details.push(`ב־${formatDateTime(item.discardedAt.toMillis())}${item.discardedByName ? ` · ${item.discardedByName}` : ''}`);
    }
    if (status === 'finished' && item.finishedAt) {
      details.push(`נגמר ב־${formatDateTime(item.finishedAt.toMillis())}${item.finishedByName ? ` · ${item.finishedByName}` : ''}`);
    }
    return (
      <InventoryItemCard
        key={item.id}
        name={item.productName}
        status={status}
        quantity={formatQuantity(item.amount, item.type)}
        expiry={formatDateTime(item.expiryTime.toMillis())}
        expiryRelative={closed ? undefined : relativeExpiry(item.expiryTime.toMillis(), nowMs)}
        opened={formatDateTime(item.openingTime.toMillis())}
        fridgeName={item.fridgeId ? fridgeMap[item.fridgeId] : undefined}
        departmentName={combinedScope ? departmentLabel(item.area) ?? undefined : undefined}
        sync={item.id ? syncByItem[item.id] : undefined}
        details={details}
        onAction={closed || showDiscardedOnly || showFinishedOnly ? undefined : () => openActionModal(item)}
        actionDisabled={offShift}
        actionHint={offShift ? 'יש להתחיל משמרת' : undefined}
      />
    );
  };

  return (
    <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Controls: search, fridge, status — before the list */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="חיפוש פריט"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flex: '1 1 180px', minWidth: 0, '& .MuiInputBase-root': { minHeight: 44 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          inputProps={{ 'aria-label': 'חיפוש פריט' }}
        />
        {fridges.length > 0 && (
          <TextField
            select
            size="small"
            label="מקרר"
            value={fridgeFilter}
            onChange={e => setFridgeFilter(e.target.value)}
            sx={{ flex: '0 1 170px', minWidth: 130, '& .MuiInputBase-root': { minHeight: 44 } }}
          >
            <MenuItem value="all">כל המקררים</MenuItem>
            {fridges.map(f => (
              <MenuItem key={f.id} value={f.id || ''}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {showStatusFilter && !isLoading && !error && scopeCount > 0 && (
        <Box role="group" aria-label="סינון לפי מצב" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', ...OPEN_STATUSES] as const).map(key => {
            const count = key === 'all' ? filteredItems.length : statusCounts[key];
            const label = key === 'all' ? 'הכל' : STATUS_LABEL[key];
            return (
              <Chip
                key={key}
                component="button"
                label={`${label} (${count})`}
                onClick={() => setStatusFilter(key)}
                color={statusFilter === key ? 'primary' : 'default'}
                variant={statusFilter === key ? 'filled' : 'outlined'}
                aria-pressed={statusFilter === key}
                sx={{ minHeight: 44, height: 'auto', borderRadius: 22, px: 0.5, fontWeight: 600, fontSize: '0.875rem' }}
              />
            );
          })}
        </Box>
      )}

      {actionNotice && (
        <Alert severity="success" role="status" onClose={() => setActionNotice(null)}>
          {actionNotice}
        </Alert>
      )}
      {offShift && !showDiscardedOnly && !showFinishedOnly && (
        <Alert severity="warning" role="note">
          יש להתחיל משמרת כדי לסמן פריטים כנגמרו או כנזרקו.
        </Alert>
      )}
      {isOffline && !error && (
        <Alert severity="info" role="note">
          אין חיבור. מוצג המצב האחרון שנשמר במכשיר.
        </Alert>
      )}

      {isLoading ? (
        <LoadingSkeleton type="admin" message="טוען פריטים..." />
      ) : error ? (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      ) : scopeCount === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, px: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{scopeEmptyText}</Typography>
          <Typography variant="body2">מוצג: {scopeLabel}</Typography>
        </Box>
      ) : visibleItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, px: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>אין פריטים שתואמים לחיפוש או לסינון</Typography>
          {filtersActive && (
            <Button onClick={clearFilters} sx={{ mt: 1, minHeight: 44 }}>
              נקה חיפוש וסינון
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          {visibleItems.map(cardFor)}
        </Box>
      )}

      {showActionModal && actionModalItem && (
        <ItemActionModal
          open={showActionModal}
          onClose={closeActionModal}
          onConfirm={handleActionConfirm}
          itemName={actionModalItem.productName}
          itemAmount={actionModalItem.amount}
          itemType={actionModalItem.type}
          loading={isActionLoading}
          error={close.error}
          closedElsewhere={close.alreadyClosed}
        />
      )}
    </Box>
  );
};

export default ItemsList; 