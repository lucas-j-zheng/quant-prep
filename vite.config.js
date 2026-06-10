import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path: set to '/<repo>/' for GitHub Pages project sites, '/' for
// Netlify/Vercel/custom domains. Override with BASE_PATH env var at build time.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Quant Prep — Interview Study',
        short_name: 'Quant Prep',
        description: 'Offline-first quant interview study app',
        theme_color: '#0f0d12',
        background_color: '#0f0d12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell + all bundled assets, INCLUDING content.json,
        // so the app is fully usable offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // KaTeX fonts / any same-origin font requests.
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        // Allow testing the SW in `vite dev` if desired.
        enabled: false,
      },
    }),
  ],
})
