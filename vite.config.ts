/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
      manifest: {
        name: 'ZenHousehold',
        short_name: 'ZenHousehold',
        description: 'Helpers and to-dos for your home, shared with your family.',
        theme_color: '#c2410c',
        background_color: '#f7f6f4',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  // `npm run dev:api` serves the Worker + local D1; run it with --port 8788.
  server: { proxy: { '/api': 'http://127.0.0.1:8788' } },
  test: { environment: 'node' },
});
