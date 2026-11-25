import React, { useState, useEffect, useMemo, useRef } from 'react';
import { departmentLabel } from '../app/access';
import { Alert, Box, Button, Chip, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { InventoryItemCard, INVENTORY_ROW_COLUMNS, INVENTORY_TABLE_MIN_WIDTH } from './inventory/InventoryItemCard';
import { tokens } from '../app/theme';
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

const LINE = `1px solid ${tokens.colors.line}`;

/**
 * V1-R1: the table layout is chosen from the list's own width (not the viewport), so a narrow
 * container (e.g. two admin panels side by side) or a 900–1000px window gets the stacked rows
 * instead of a clipped table. No ResizeObserver (old browsers/tests) → stacked, which fits anywhere.
 */
function useFitsTable(ref: React.RefObject<HTMLElement | null>) {
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setFits(el.clientWidth >= INVENTORY_TABLE_MIN_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return fits;
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
        layout={tableLayout ? 'table' : 'stacked'}
      />
    );
  };

  const listRef = useRef<HTMLDivElement>(null);
  const tableLayout = useFitsTable(listRef);

  // V1: urgency groups (text headers) when every status is shown in an open list; a single
  // status filter or a closed-items tab shows one plain list.
  const grouped = showStatusFilter && effectiveStatusFilter === 'all';
  const groups: { status: DisplayStatus; items: Item[] }[] = [];
  for (const item of visibleItems) {
    const status = statusOf(item);
    const last = groups[groups.length - 1];
    if (grouped && last?.status === status) last.items.push(item);
    else if (grouped || !last) groups.push({ status, items: [item] });
    else last.items.push(item);
  }

  const columnHeader = tableLayout && (
    <Box
      aria-hidden
      data-testid="inventory-column-header"
      sx={{
        display: 'grid',
        gridTemplateColumns: INVENTORY_ROW_COLUMNS,
        columnGap: 1.5,
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: 'text.secondary',
      }}
    >
      <span>מוצר</span>
      <span>כמות</span>
      <span>מקרר</span>
      <span>נפתח</span>
      <span>נותר</span>
      <span>תוקף</span>
      <span />
    </Box>
  );

  return (
    <Box ref={listRef} dir="rtl" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Controls: search + fridge on one line, compact status chips below */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="חיפוש פריט"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flex: '1 1 auto', minWidth: 0, maxWidth: { md: 340 }, '& .MuiInputBase-root': { minHeight: 44 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          inputProps={{ 'aria-label': 'חיפוש פריט' }}
        />
        {fridges.length > 0 && (
          <TextField
            select
            size="small"
            value={fridgeFilter}
            onChange={e => setFridgeFilter(e.target.value)}
            SelectProps={{ inputProps: { 'aria-label': 'מקרר' } }}
            sx={{ flex: '0 1 170px', minWidth: 0, maxWidth: '46%', '& .MuiInputBase-root': { minHeight: 44 } }}
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
        <Box
          role="group"
          aria-label="סינון לפי מצב"
          sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', py: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {(['all', ...OPEN_STATUSES] as const).map(key => {
            const count = key === 'all' ? filteredItems.length : statusCounts[key];
            const label = key === 'all' ? 'הכל' : STATUS_LABEL[key];
            const selected = statusFilter === key;
            return (
              <Chip
                key={key}
                component="button"
                label={`${label} (${count})`}
                onClick={() => setStatusFilter(key)}
                variant="outlined"
                aria-pressed={selected}
                sx={{
                  flexShrink: 0,
                  height: 'auto',
                  minHeight: 44, // UI1-R2: real 44px target, not only a pseudo-element hit area
                  borderRadius: 22,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  borderColor: selected ? 'primary.main' : tokens.colors.lineStrong,
                  bgcolor: selected ? tokens.colors.primaryTint : 'transparent',
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
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
        <Box sx={{ textAlign: 'center', py: 5, px: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700 }}>{scopeEmptyText}</Typography>
          <Typography variant="body2" color="text.secondary">מוצג: {scopeLabel}</Typography>
        </Box>
      ) : visibleItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5, px: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700 }}>אין פריטים שתואמים לחיפוש או לסינון</Typography>
          {filtersActive && (
            <Button onClick={clearFilters} variant="outlined" sx={{ mt: 1.5, minHeight: 44 }}>
              נקה חיפוש וסינון
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            mx: { xs: -1.5, sm: 0 },
            // Explicit colour in every breakpoint: a responsive `border: 1` resets the colour to currentColor.
            borderTop: LINE,
            border: tableLayout ? LINE : undefined,
            borderRadius: tableLayout ? 2 : undefined,
            overflow: 'clip',
          }}
        >
          {columnHeader}
          {groups.map(group => (
            <Box key={group.status + group.items[0].id} role={grouped ? 'group' : undefined} aria-labelledby={grouped ? `group-${group.status}` : undefined}>
              {grouped && (
                <Box
                  id={`group-${group.status}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: { xs: 1.5, md: 2 },
                    py: 0.75,
                    bgcolor: tokens.colors.surfaceSoft,
                    borderBottom: 1,
                    borderColor: 'divider',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: group.status === 'expired' ? 'error.main' : group.status === 'expiring' ? 'warning.main' : 'text.secondary',
                  }}
                >
                  <span>{STATUS_LABEL[group.status]}</span>
                  <span>{group.items.length}</span>
                </Box>
              )}
              {group.items.map(cardFor)}
            </Box>
          ))}
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