/// <reference lib="webworker" />
/**
 * The single TossIt service worker, built by vite-plugin-pwa (injectManifest) and served at
 * /service-worker.js with root scope. Logic lives in swHandlers/swLogic for testing.
 */
import { installWorker, WorkerScope } from './swHandlers';
import type { PrecacheEntry } from './swLogic';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | PrecacheEntry>;
};

installWorker(self as unknown as WorkerScope, self.__WB_MANIFEST);
