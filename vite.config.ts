import { Readable } from 'node:stream'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

/** Serves the Vercel Function POST /api/generate from the dev server, with keys from .env.local. */
function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))

      server.middlewares.use('/api/generate', (req, res, next) => {
        if (req.method !== 'POST') return next()

        const abort = new AbortController()
        res.on('close', () => abort.abort())
        const request = new Request(new URL(req.originalUrl ?? '/', 'http://localhost'), {
          method: 'POST',
          headers: req.headers as Record<string, string>,
          body: Readable.toWeb(req) as ReadableStream,
          duplex: 'half',
          signal: abort.signal,
        } as RequestInit)

        server
          .ssrLoadModule('/api/generate.ts')
          .then((module) => module.POST(request) as Promise<Response>)
          .then(async (response) => {
            res.statusCode = response.status
            response.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(Buffer.from(await response.arrayBuffer()))
          })
          .catch(next)
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    apiDevServer(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Cards',
        short_name: 'Cards',
        description: 'Карточки для повторения слов',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    // A time zone with DST, so session expiry is tested across a clock change.
    env: { TZ: 'Europe/Berlin' },
  },
})
