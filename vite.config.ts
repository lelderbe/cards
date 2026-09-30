import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cards',
        short_name: 'Cards',
        description: 'Карточки для повторения слов',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
      },
    }),
  ],
  test: {
    // A time zone with DST, so session expiry is tested across a clock change.
    env: { TZ: 'Europe/Berlin' },
  },
})
