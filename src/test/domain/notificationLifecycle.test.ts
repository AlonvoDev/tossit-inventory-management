import { describe, expect, it, vi } from 'vitest';
import { startDiscardScheduler, stopDiscardScheduler, getSchedulerStatus } from '../../services/discardScheduler';
import { setupPeriodicChecks } from '../../api/expirationChecker';
import { sendNotification, sendEveningDiscardReminders } from '../../utils/notificationUtils';
vi.mock('../../services/firebase', () => ({ db: {}, functions: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', async original => original<typeof import('firebase/firestore')>());
describe('retired page notification scheduling', () => {
  it('does not create page timers or local notifications from old scheduler entry points', () => {
    const interval = vi.spyOn(globalThis, 'setInterval'); const notification = vi.fn();
    vi.stubGlobal('Notification', notification);
    try {
      startDiscardScheduler('a'); stopDiscardScheduler();
      expect(setupPeriodicChecks('a', 'staff')).toBeNull();
      expect(sendNotification('Old path')).toBeNull();
      expect(sendEveningDiscardReminders([{ productName: 'Milk' }])).toBeNull();
      expect(getSchedulerStatus()).toMatchObject({ active: false, hasInterval: false, source: 'server' });
      expect(interval).not.toHaveBeenCalled(); expect(notification).not.toHaveBeenCalled();
    } finally { interval.mockRestore(); vi.unstubAllGlobals(); }
  });
});
