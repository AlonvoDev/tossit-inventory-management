import { onSchedule } from 'firebase-functions/v2/scheduler';
import { firebaseNotificationService } from './firebaseNotifications';
import { israelSlot } from './notifications';
/** One job, nine invocations/day; israelSlot filters to the five actual action slots. */
export const scheduledInventoryNotifications = onSchedule({
  schedule: '0,20,40 0,8,23 * * *', timeZone: 'Asia/Jerusalem', region: 'us-central1',
  timeoutSeconds: 300, maxInstances: 2, retryCount: 3, minBackoffSeconds: 30, maxBackoffSeconds: 120,
  secrets: ['WEB_PUSH_VAPID_PRIVATE_KEY'],
}, async event => {
  const slot = israelSlot(new Date(event.scheduleTime));
  if (slot) await firebaseNotificationService().run(slot);
});
