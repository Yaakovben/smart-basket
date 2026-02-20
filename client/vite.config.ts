import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Unique build ID injected at build time — changes on every deploy
    '__BUILD_VERSION__': JSON.stringify(Date.now().toString()),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      devOptions: {
        enabled: false
      },
      injectManifest: {
        globPatterns: [], // No caching
      },
      manifest: {
        name: 'Smart Basket',
        short_name: 'Smart Basket',
        description: 'רשימת קניות חכמה - פשוט, נוח, משותף',
        theme_color: '#14B8A6',
        background_color: '#14B8A6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'he',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI and Emotion must be together (MUI depends on Emotion)
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Socket.io in separate chunk (loaded after auth)
          'vendor-socket': ['socket.io-client'],
          // Sentry in separate chunk (monitoring can load late)
          'vendor-sentry': ['@sentry/react'],
        }
      }
    }
  }
})
