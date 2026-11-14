import { createPrivateKey } from 'node:crypto';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { HostingError } from './http';
type Env = Record<string, string | undefined>;
export interface AdminConfig { projectId: string; emulated: boolean; account?: ServiceAccount }
export function readAdminConfig(env: Env): AdminConfig {
  const projectId = env.TOSSIT_FIREBASE_PROJECT_ID || 'tossit-4cc02';
  if (env.TOSSIT_SERVER_EMULATORS === 'true') {
    if (!projectId.startsWith('demo-') || !['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST'].every(key => /^(127\.0\.0\.1|localhost):\d+$/.test(env[key] || ''))) throw new HostingError('unavailable');
    return { projectId, emulated: true };
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST) throw new HostingError('unavailable');
  try {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || projectId.startsWith('demo-')) throw new Error();
    const value = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '');
    if (value.type !== 'service_account' || value.project_id !== projectId || typeof value.client_email !== 'string' || !value.client_email.endsWith(`@${projectId}.iam.gserviceaccount.com`) || typeof value.private_key !== 'string') throw new Error();
    createPrivateKey(value.private_key);
    return { projectId, emulated: false, account: { projectId, clientEmail: value.client_email, privateKey: value.private_key } };
  } catch { throw new HostingError('unavailable'); }
}
export function ensureHostingAdmin(env: Env = process.env): void {
  const config = readAdminConfig(env);
  const existing = getApps().find(app => app.name === '[DEFAULT]');
  if (existing) {
    if (existing.options.projectId !== config.projectId) throw new HostingError('unavailable');
    return;
  }
  initializeApp(config.emulated ? { projectId: config.projectId } : { projectId: config.projectId, credential: cert(config.account!) });
}
