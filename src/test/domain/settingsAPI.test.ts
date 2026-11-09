import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBusinessSettings, saveBusinessSettings } from '../../api/settingsAPI';
import { scopedBusinessQuery } from '../../api/access';

const state = vi.hoisted(() => ({
  uid: 'admin' as string | null, role: 'admin', hold: false, resume: undefined as undefined | (() => void),
  writes: [] as { path: string; data: unknown }[], failure: undefined as Error | undefined,
  settings: undefined as Record<string, unknown> | undefined,
}));
vi.mock('../../services/firebase', () => ({ db: {}, auth: { get currentUser() { return state.uid ? { uid: state.uid } : null; } } }));
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  doc: (_db: unknown, collection: string, id: string) => `${collection}/${id}`,
  collection: (_db: unknown, name: string) => name,
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  query: (...args: unknown[]) => args,
  getDocFromServer: async (path: string) => {
    if (state.hold) await new Promise<void>(resolve => { state.resume = resolve; });
    if (state.failure) throw state.failure;
    const data = path.startsWith('users/') ? { email: 'user@example.test', fullName: 'User', businessId: 'a', department: 'בר', role: state.role } : state.settings;
    return { exists: () => data !== undefined, data: () => data };
  },
  setDoc: async (path: string, data: unknown) => { if (state.failure) throw state.failure; state.writes.push({ path, data }); },
}));
beforeEach(() => { Object.assign(state, { uid: 'admin', role: 'admin', hold: false, resume: undefined, writes: [], failure: undefined, settings: undefined }); });
describe('settings API and query authority', () => {
  it('reads missing defaults and saves the current admin business document', async () => {
    const settings = await getBusinessSettings();
    await saveBusinessSettings({ ...settings, eveningRemindersEnabled: false });
    expect(state.writes).toEqual([{ path: 'businessSettings/a', data: { ...settings, eveningRemindersEnabled: false } }]);
  });
  it('permits staff reads but rejects manager writes', async () => {
    state.role = 'manager';
    const settings = await getBusinessSettings();
    await expect(saveBusinessSettings(settings)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.writes).toEqual([]);
  });
  it('propagates real permission failures instead of reporting default settings', async () => {
    state.failure = Object.assign(new Error('Denied'), { code: 'permission-denied' });
    await expect(getBusinessSettings()).rejects.toBe(state.failure);
  });
  it('does not write after identity changes during the authoritative profile read', async () => {
    const settings = { timezone: 'Asia/Jerusalem' as const, eveningRemindersEnabled: true, morningSummaryEnabled: true, autoEndShiftsAtMidnight: false };
    state.hold = true;
    const pending = saveBusinessSettings(settings);
    state.uid = 'another'; state.resume!();
    await expect(pending).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(state.writes).toEqual([]);
  });
  it('denies guests without reading business settings', async () => {
    state.uid = null;
    await expect(getBusinessSettings()).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('constrains manager queries on the server, including legacy department spellings', async () => {
    state.role = 'manager';
    const result = await scopedBusinessQuery('products', 'area', 'a');
    expect(result).toEqual(['products', { field: 'businessId', op: '==', value: 'a' }, { field: 'area', op: 'in', value: ['bar', 'בר'] }]);
    await expect(scopedBusinessQuery('products', 'area', 'b')).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
