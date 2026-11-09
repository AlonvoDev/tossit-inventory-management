/**
 * Holds a waiting service-worker update until the user accepts it. Stored (not just dispatched)
 * so a prompt that mounts after registration still sees it. Updates never run automatically:
 * activating a new worker reloads the page, and the user decides when (e.g. not mid-form).
 */
type ApplyUpdate = () => Promise<void>;

let pending: ApplyUpdate | null = null;
const listeners = new Set<(available: boolean) => void>();

export const setUpdateAvailable = (apply: ApplyUpdate) => {
  pending = apply;
  listeners.forEach(l => l(true));
};

export const isUpdateAvailable = () => pending !== null;

export const subscribeUpdate = (listener: (available: boolean) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Activates the waiting worker; the page reloads when it takes control. */
export const applyUpdate = async (): Promise<boolean> => {
  if (!pending) return false;
  await pending();
  return true;
};

/** Test helper. */
export const resetUpdateStore = () => {
  pending = null;
  listeners.clear();
};
