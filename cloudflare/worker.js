import { handleNode } from './node-handler.js'
import { createAccountHandler } from '../server/accountHandler.js'
import { createNearbyRestaurantsHandler } from '../server/nearbyRestaurantsHandler.js'
import { createPlaceExtrasHandler } from '../server/placeExtrasHandler.js'
import { createVisitVerificationHandler } from '../server/visitVerificationHandler.js'

const cache = new WeakMap()
function handlers(env) {
  if (!cache.has(env)) {
    const getApiKey = () => env.GOOGLE_PLACES_API_KEY
    cache.set(env, {
      '/api/account': createAccountHandler({ getConfig: () => ({ url: env.VITE_SUPABASE_URL, secret: env.SUPABASE_SECRET_KEY }) }),
      '/api/nearby-restaurants': createNearbyRestaurantsHandler({ getApiKey }),
      '/api/place-photo': createPlaceExtrasHandler('photo', { getApiKey }),
      '/api/place-details': createPlaceExtrasHandler('details', { getApiKey }),
      '/api/visit-verification': createVisitVerificationHandler({ getConfig: () => ({ url: env.VITE_SUPABASE_URL, secret: env.SUPABASE_SECRET_KEY,
        placesKey: env.GOOGLE_PLACES_API_KEY, ocrKey: env.NOM_RECEIPT_OCR_API_KEY,
        qrPartners: (env.NOM_QR_PARTICIPATING_PLACES || '').split(',').filter(Boolean), env }) }),
    })
  }
  return cache.get(env)
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    const handler = handlers(env)[path]
    if (handler) return handleNode(request, handler, env)
    if (path.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 })
    return env.ASSETS.fetch(request)
  },
}
