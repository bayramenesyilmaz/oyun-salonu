import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Oyun Salonu',
        short_name: 'Oyun Salonu',
        description: 'Tarayıcıda oynanan 3B oyunlar: Karakuyu, KARAKOL ve dahası.',
        lang: 'tr',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        categories: ['games'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Kabuk önbelleğe alınır; oyun dosyaları ilk açıldıklarında önbelleğe girer
        // (bir oyunu açan kişi diğer oyunları indirmek zorunda kalmaz).
        globPatterns: ['index.html', 'favicon.svg', 'icons/*.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//, /\.\w+$/],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'oyun-kod', expiration: { maxEntries: 200 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\.(png|svg|jpg|webp|glb|gltf|mp3|ogg|wav|json|bin)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'oyun-varlik', expiration: { maxEntries: 1500 } },
          },
          {
            urlPattern: ({ url }) => /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname),
            handler: 'CacheFirst',
            options: { cacheName: 'yazitipi', expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 3000, target: 'es2020' },
  server: { host: true },
});
