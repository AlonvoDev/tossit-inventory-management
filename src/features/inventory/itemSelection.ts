import { normalizeDepartment } from '../../app/access';

/** Minimal item shape used for list selection (matches the C2 `Item` read model). */
export interface SelectableItem {
  area: unknown;
  expiryTime: { toMillis: () => number };
  discarded?: boolean;
  isThrown?: boolean;
  finished?: boolean;
}

export type ListMode = 'open' | 'active' | 'expiring' | 'expired' | 'discarded' | 'finished';

export const EXPIRING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export const isClosed = (item: SelectableItem) => !!(item.discarded || item.isThrown || item.finished);
export const isDiscarded = (item: SelectableItem) => !!(item.discarded || item.isThrown);

/**
 * Pure list selection. Department comparison is canonical (legacy Hebrew values match);
 * an item whose department cannot be determined is never hidden behind a department filter
 * silently — it is excluded only when a specific department is requested.
 */
export const selectItems = <T extends SelectableItem>(
  items: readonly T[],
  opts: { mode: ListMode; department?: unknown },
  nowMs: number,
): T[] => {
  const department = opts.department === undefined ? null : normalizeDepartment(opts.department);
  const inDepartment = (item: T) => department === null || normalizeDepartment(item.area) === department;
  const expiry = (item: T) => item.expiryTime.toMillis();
  const byMode: Record<ListMode, (item: T) => boolean> = {
    open: item => !isClosed(item),
    active: item => !isClosed(item) && expiry(item) > nowMs,
    expiring: item => !isClosed(item) && expiry(item) > nowMs && expiry(item) <= nowMs + EXPIRING_WINDOW_MS,
    // Expired and still open: the items that need handling.
    expired: item => !isClosed(item) && expiry(item) <= nowMs,
    discarded: item => isDiscarded(item),
    finished: item => !!item.finished && !isDiscarded(item),
  };
  return items
    .filter(item => inDepartment(item) && byMode[opts.mode](item))
    .sort((a, b) => expiry(a) - expiry(b));
};
