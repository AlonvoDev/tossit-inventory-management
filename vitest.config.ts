/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'src/test/rules/**', 'functions/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
