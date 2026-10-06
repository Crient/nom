import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createNearbyRestaurantsHandler } from './server/nearbyRestaurantsHandler.js'
import { createPlaceExtrasHandler } from './server/placeExtrasHandler.js'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), {
    name: 'nom-nearby-server',
    configureServer(server) {
      // Read only on the server. Never define a VITE_ variable for the Places secret.
      const env = loadEnv(mode, process.cwd(), '')
      const getApiKey = () => process.env.GOOGLE_PLACES_API_KEY || env.GOOGLE_PLACES_API_KEY
      const endpoints = {
        '/api/nearby-restaurants': createNearbyRestaurantsHandler({ getApiKey, debug: (process.env.NOM_NEARBY_DEBUG || env.NOM_NEARBY_DEBUG) === '1' }),
        '/api/place-photo': createPlaceExtrasHandler('photo', { getApiKey }),
        '/api/place-details': createPlaceExtrasHandler('details', { getApiKey }),
      }
      server.middlewares.use((req, res, next) => {
        const handler = endpoints[req.url?.split('?')[0]]
        if (handler) return handler(req, res)
        next()
      })
    },
  }],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
  },
}))
