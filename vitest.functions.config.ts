import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'node', include: ['functions/test/**/*.test.ts'],
  exclude: ['functions/test/callables.integration.test.ts'],
} });
