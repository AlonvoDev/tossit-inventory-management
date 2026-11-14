import { parseTriggerDelivery } from '@neon/functions/triggers';
/** Only valid behind Neon's edge, which strips client-set x-neon-* headers. */
export function parseNeonSchedule(headers: Headers, body: unknown, expectedTriggerId: string | undefined): number | null {
  if (!expectedTriggerId) return null;
  const parsed = parseTriggerDelivery({ headers, body });
  if (!parsed.ok || parsed.invocation.type !== 'schedule' || parsed.invocation.trigger.id !== expectedTriggerId) return null;
  const at = Date.parse(parsed.invocation.data.scheduledAt);
  return Number.isFinite(at) && at % 60000 === 0 ? at : null;
}
