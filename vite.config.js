import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createAccountHandler } from './server/accountHandler.js'
import { createNearbyRestaurantsHandler } from './server/nearbyRestaurantsHandler.js'
import { createPlaceExtrasHandler } from './server/placeExtrasHandler.js'
import { createVisitVerificationHandler } from './server/visitVerificationHandler.js'
import { verificationPublicKey } from './server/verificationSignature.js'

export default defineConfig(({ mode }) => {
  const serverEnv={...loadEnv(mode,process.cwd(),''),...process.env}
  // Only the derived public verification key enters the client build.
  const publicKey=serverEnv.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')?verificationPublicKey(serverEnv.SUPABASE_SECRET_KEY):''
  return ({
  // Reward QA belongs to local/Preview builds, even if a production env flag
  // is accidentally set. This define does not expose any server secrets.
  define: { ...(process.env.VERCEL_ENV === 'production' ? { 'import.meta.env.VITE_ENABLE_REWARD_QA': JSON.stringify('false') } : {}),
    ...(mode==='test'?{}:{'import.meta.env.VITE_NOM_VERIFICATION_PUBLIC_KEY':JSON.stringify(publicKey)}) },
  plugins: [react(), tailwindcss(), {
    name: 'nom-nearby-server',
    configureServer(server) {
      // Read only on the server. Never define a VITE_ variable for the Places secret.
      const env = loadEnv(mode, process.cwd(), '')
      const getApiKey = () => process.env.GOOGLE_PLACES_API_KEY || env.GOOGLE_PLACES_API_KEY
      const endpoints = {
        '/api/visit-verification': createVisitVerificationHandler({getConfig:()=>({url:serverEnv.VITE_SUPABASE_URL,secret:serverEnv.SUPABASE_SECRET_KEY,
          placesKey:serverEnv.GOOGLE_PLACES_API_KEY,ocrKey:serverEnv.NOM_RECEIPT_OCR_API_KEY,
          qrPartners:(serverEnv.NOM_QR_PARTICIPATING_PLACES??'').split(',').filter(Boolean),env:serverEnv})}),
        '/api/account': createAccountHandler({ getConfig: () => ({ url: process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY }) }),
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
})})
