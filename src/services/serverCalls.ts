import { httpsCallable, httpsCallableFromURL, type HttpsCallableOptions } from 'firebase/functions';
import { functions } from './firebase';
const names = ['createEmployee', 'updateEmployee', 'deactivateEmployee', 'upsertPushDevice', 'revokePushDevice', 'getPushDeviceStatus'] as const;
export type ServerCallName = typeof names[number];
function failure(code: string): Error { return Object.assign(new Error('Server configuration is unavailable'), { code: `functions/${code}` }); }
/** The Firebase SDK still owns ID tokens, callable encoding, timeouts and error decoding. */
export function serverCallable<Input = unknown, Output = unknown>(name: ServerCallName, options: HttpsCallableOptions = { timeout: 10000 }): (input: Input) => Promise<{ data: Output }> {
  return async input => {
    if (!(names as readonly string[]).includes(name)) throw failure('invalid-argument');
    const configured = import.meta.env.VITE_SERVER_API_URL;
    if (configured === undefined || configured === '') return httpsCallable<Input, Output>(functions, name, options)(input);
    let url: URL;
    try {
      url = new URL(configured);
      const local = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
      const emulator = local && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && ['localhost', '127.0.0.1'].includes(url.hostname);
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && emulator)) || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { throw failure('unavailable'); }
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return httpsCallableFromURL<Input, Output>(functions, new URL(name, url).href, options)(input);
  };
}
