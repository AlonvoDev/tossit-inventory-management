import { createHttpHandler } from '../src/hosting/http';
import { hostingServices } from '../src/hosting/services';
import { parseNeonSchedule } from './schedule';
export function createNeonHandler(env: Record<string,string | undefined> = process.env) {
  const allowedOrigins = (env.TOSSIT_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    const local = env.TOSSIT_SERVER_EMULATORS === 'true' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error('Invalid server origin configuration');
  }
  return createHttpHandler({ ...hostingServices(env), allowedOrigins,
    parseTrigger: (headers,body) => parseNeonSchedule(headers,body,env.TOSSIT_NEON_TRIGGER_ID),
  });
}
export default { fetch: createNeonHandler() };
