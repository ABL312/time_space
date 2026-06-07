import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// API backend target: set API_BACKEND=go in .env or environment to use Go backend (:8080)
// Default: FastAPI backend (:8000)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_BACKEND === 'go'
    ? 'http://localhost:8080'
    : 'http://localhost:8000'

  return {
    plugins: [
      react(),
      tailwindcss(),
      basicSsl(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: '时空信箱 - Time Space Mailbox',
          short_name: '时空信箱',
          description: '基于GPS+AR的地理位置情感信息传递平台',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'media-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three')) {
              return 'three-vendor'
            }
          },
        },
      },
      chunkSizeWarningLimit: 750,
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: true,
      headers: {
        'Permissions-Policy': 'xr-spatial-tracking=(self), camera=(self), geolocation=(self)',
      },
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/uploads': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
