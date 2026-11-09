import { createQueueStore } from './queueStore';
import type { UserProfile } from '../types/UserProfile';
import { parseUserProfile } from '../domain/userProfile';
import { normalizeTimestamp } from '../domain/normalizeItem';
export const offlineStore = createQueueStore();
export async function rememberProfile(profile: UserProfile): Promise<void> {
  await offlineStore.putProfile(profile.uid, profile as unknown as Record<string, unknown>);
}
export async function readRememberedProfile(uid: string): Promise<UserProfile | null> {
  const data = await offlineStore.getProfile(uid);
  if (data) for (const field of ['createdAt', 'shiftStartedAt']) {
    if (data[field]) { try { data[field] = normalizeTimestamp(data[field]); } catch { delete data[field]; } }
  }
  return data ? parseUserProfile(uid, data) : null;
}
