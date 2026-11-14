import { getAuth } from 'firebase-admin/auth';
import { firebaseUserService } from '../firebaseUsers';
import { firebaseNotificationService } from '../firebaseNotifications';
import { israelSlot } from '../notifications';
import { ensureHostingAdmin, readAdminConfig } from './admin';
import { HostingError, type HostingDependencies, type ServerCallName } from './http';
export function hostingServices(env: Record<string,string | undefined> = process.env): Pick<HostingDependencies,'authenticate'|'call'|'scheduled'|'ready'> {
  return {
    ready: () => { try { readAdminConfig(env); return true; } catch { return false; } },
    authenticate: async token => {
      ensureHostingAdmin(env);
      const decoded = await getAuth().verifyIdToken(token, true);
      return decoded.uid;
    },
    call: async (name: ServerCallName, input: unknown, uid: string | null) => {
      ensureHostingAdmin(env);
      const data = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string,unknown> : {};
      switch (name) {
        case 'createEmployee': return { uid: await firebaseUserService().create(uid, input) };
        case 'updateEmployee':
        case 'deactivateEmployee': {
          if (typeof data.uid !== 'string' || !data.uid) throw new HostingError('invalid-argument');
          const service = firebaseUserService();
          if (name === 'updateEmployee') await service.update(uid, data.uid, data.updates);
          else await service.deactivate(uid, data.uid);
          return { success: true };
        }
        case 'upsertPushDevice': return firebaseNotificationService().register(uid,input);
        case 'revokePushDevice': return firebaseNotificationService().revoke(input,uid);
        case 'getPushDeviceStatus': return firebaseNotificationService().status(uid,input);
      }
    },
    scheduled: async at => {
      if (!Number.isFinite(at) || at > Date.now() + 60000 || Date.now() - at > 600000) return;
      const slot = israelSlot(new Date(at));
      if (!slot) return; // No secrets, database, or transport on unused UTC ticks.
      ensureHostingAdmin(env);
      await firebaseNotificationService().run(slot);
    },
  };
}
