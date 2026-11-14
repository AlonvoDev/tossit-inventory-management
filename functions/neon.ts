import { defineConfig } from '@neon/config/v1';
export default defineConfig({
  functions: {
    tossitapi: { name: 'TossIt API', source: 'neon/index.ts', env: {
      TOSSIT_FIREBASE_PROJECT_ID: { value: process.env.TOSSIT_FIREBASE_PROJECT_ID, required: true },
      FIREBASE_SERVICE_ACCOUNT_JSON: { value: process.env.FIREBASE_SERVICE_ACCOUNT_JSON, required: true },
      TOSSIT_ALLOWED_ORIGINS: { value: process.env.TOSSIT_ALLOWED_ORIGINS, required: true },
      WEB_PUSH_VAPID_PUBLIC_KEY: { value: process.env.WEB_PUSH_VAPID_PUBLIC_KEY, required: true },
      WEB_PUSH_VAPID_PRIVATE_KEY: { value: process.env.WEB_PUSH_VAPID_PRIVATE_KEY, required: true },
      WEB_PUSH_CONTACT: { value: process.env.WEB_PUSH_CONTACT, required: true },
      TOSSIT_NEON_TRIGGER_ID: { value: process.env.TOSSIT_NEON_TRIGGER_ID, required: false, onUndefined: 'skip' },
    } },
  },
  triggers: {
    inventory: { type: 'schedule', function: 'tossitapi', cron: '0,20,40 * * * *', functionPath: '/scheduled', enabled: false },
  },
});
