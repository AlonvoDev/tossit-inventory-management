/** Browser scheduler retired. Scheduled Firebase functions are the sole sender. */
export function startDiscardScheduler(businessId: string): void { void businessId; }
export function stopDiscardScheduler(): void { /* No browser interval to clear. */ }
export const getSchedulerStatus = () => ({ active: false, hasInterval: false, source: 'server' as const });
export async function forceRunSchedulerChecks(businessId: string): Promise<void> {
  void businessId;
  throw Object.assign(new Error('Scheduled notification jobs cannot be triggered from a client'), { code: 'permission-denied' });
}
