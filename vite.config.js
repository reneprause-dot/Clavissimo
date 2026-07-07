import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['clavis-logo.png'],
      manifest: {
        name: 'Clavissimo',
        short_name: 'Clavissimo',
        description: 'Cannabis-Compliance. Einfach.',
        theme_color: '#123A22',
        background_color: '#F5F8F4',
        display: 'standalone',
        icons: [
          { src: '/clavis-logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/clavis-logo.png', sizes: '512x512', type: 'image/png' },
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
