import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Clavissimo/', // GitHub Pages liefert unter github.io/Clavissimo/ aus
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'clavis-logo.png', 'clavis-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Clavissimo',
        short_name: 'Clavissimo',
        description: 'Cannabis-Compliance. Einfach.',
        theme_color: '#123A22',
        background_color: '#F5F8F4',
        display: 'standalone',
        icons: [
          { src: '/Clavissimo/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/Clavissimo/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/Clavissimo/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
})
