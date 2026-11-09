import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // One worker, built from src/pwa/service-worker.ts and served as /service-worker.js
      // with root scope. The same URL that older clients registered, so they update in place.
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'service-worker.ts',
      registerType: 'prompt',
      // Registration happens once, in src/app/main.tsx via virtual:pwa-register.
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'TossIt - ניהול מלאי חכם',
        short_name: 'TossIt',
        description: 'אפליקציה לניהול מלאי ומעקב אחר תוקף מוצרים במסעדות ובבתי עסק',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F7F9',
        theme_color: '#33AD92',
        categories: ['business', 'productivity', 'utilities'],
        lang: 'he',
        dir: 'rtl',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  },
  // Absolute base: SPA deep links (/admin/users) must load /assets/*, not /admin/assets/*.
  base: '/'
})
