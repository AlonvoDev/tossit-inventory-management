import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { assertCurrentActor, getCurrentActor } from './access';
import type { BusinessSettings } from '../domain/contracts';
import { InventoryError, invalid } from '../domain/errors';
import { resolveBusinessSettings } from '../domain/settings';

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const actor = await getCurrentActor();
  const snapshot = await getDocFromServer(doc(db, 'businessSettings', actor.businessId));
  assertCurrentActor(actor);
  return resolveBusinessSettings(snapshot.exists() ? snapshot.data() : null);
}
export async function saveBusinessSettings(input: BusinessSettings): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.role !== 'admin') throw new InventoryError('permission-denied', 'Only a business admin can change settings');
  if (!input || Object.keys(input).length !== 4 || Object.keys(input).some(key => !['timezone', 'eveningRemindersEnabled', 'morningSummaryEnabled', 'autoEndShiftsAtMidnight'].includes(key))) invalid('Provide the complete settings document');
  // Resolve rejects malformed values; writes never persist unknown keys.
  const settings = resolveBusinessSettings(input as unknown as Record<string, unknown>);
  if (Object.values(input).some(value => value === undefined)) invalid('Settings values cannot be missing');
  assertCurrentActor(actor);
  await setDoc(doc(db, 'businessSettings', actor.businessId), settings);
  assertCurrentActor(actor);
}
