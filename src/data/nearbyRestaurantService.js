import records from './catalog/records.json'
import { recordNearbyUsage } from './nearbyUsage'
import { CACHE_TTL_MS, dedupeRestaurants, MAX_RESULTS, MAX_NEARBY_DISTANCE_MILES, SEARCH_VERSION, approximateArea, haversineMiles, isGoogleRestaurantId,
  mapsUriForPlaceId, restaurantIdentityIds, safeMapsUri, searchKey, validCoordinates, textSearchMatchEvidence } from '../../shared/nearbyRestaurants.js'

const canonicalIds = new Set(records.map(dish => dish.id))
const STORAGE_KEY = 'nom.nearby.place-metadata.v1'
const CLIENT_TIMEOUT_MS = 20_000
const MAX_SEARCHES = 20

export class RestaurantSearchError extends Error {
  constructor(code) { super(code); this.name = 'RestaurantSearchError'; this.code = code }
}

export function nearbyErrorMessage(code) {
  if (code === 'LOCATION_DENIED') return 'Location is needed to find restaurants near you. Allow location in your browser settings, then try again.'
  if (code === 'LOCATION_UNAVAILABLE') return 'Your location is unavailable. Check your device location settings and try again.'
  if (code === 'LOCATION_TIMEOUT') return 'Finding your location took too long. Please try again.'
  if (code === 'LOCATION_ERROR') return 'We couldn’t find your location. Please try again.'
  if (code === 'NOT_CONFIGURED' && import.meta.env.DEV) return 'Nearby search is not configured locally. Set the server Places key in .env.local and restart the dev server.'
  if (['QUOTA_LIMIT', 'NOT_CONFIGURED', 'PROVIDER_CONFIGURATION', 'PROVIDER_REQUEST', 'PROVIDER_UNAVAILABLE', 'FORBIDDEN'].includes(code)) return 'Nearby restaurant search is temporarily unavailable. Try again later.'
  if (code === 'TIMEOUT') return 'Finding nearby restaurants took too long. Please try again.'
  return 'We couldn’t load nearby restaurants. Check your connection and try again.'
}

function getStorage() { try { return globalThis.localStorage ?? null } catch { return null } }
function abortError() { return new DOMException('Search cancelled', 'AbortError') }

function present(data, coordinates, apiCalls = 0) {
  return { ...data, searchArea: data.searchArea ?? approximateArea(coordinates), apiCalls, restaurants: dedupeRestaurants(data.restaurants.map(restaurant => ({ ...restaurant,
    matchEvidence: textSearchMatchEvidence(restaurant.matchType),
    approximateDistanceMiles: haversineMiles(coordinates, restaurant) }))
    .filter(restaurant => Number.isFinite(restaurant.approximateDistanceMiles) && restaurant.approximateDistanceMiles <= MAX_NEARBY_DISTANCE_MILES))
    .sort((a, b) => a.approximateDistanceMiles - b.approximateDistanceMiles) }
}

/** In-session displayed results are reused. Durable storage contains only Place IDs,
 * venue coordinates and Nom search metadata, never names, addresses, ratings or hours.
 */
export function createRestaurantSearchService({ fetchImpl = (...args) => globalThis.fetch(...args), now = Date.now,
  storage = getStorage, diagnostic = () => {}, timeoutMs = CLIENT_TIMEOUT_MS } = {}) {
  const displayed = new Map(), pending = new Map()
  const fresh = row => row && Number.isFinite(row.createdAt) && row.createdAt <= now() && now() - row.createdAt < CACHE_TTL_MS
  const readMetadata = () => {
    try {
      const raw = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? 'null')
      if (raw?.version !== 1 || !Array.isArray(raw.searches)) return []
      const searches = raw.searches.filter(row => fresh(row) && canonicalIds.has(row.dishId) && typeof row.key === 'string' && row.key.startsWith(`${SEARCH_VERSION}:`)
        && Array.isArray(row.places) && row.places.length <= MAX_RESULTS
        && row.places.every(place => isGoogleRestaurantId(place.id) && validCoordinates(place)))
        .slice(-MAX_SEARCHES).map(row => ({ key: row.key, dishId: row.dishId, createdAt: row.createdAt,
          places: dedupeRestaurants(row.places).map(({ id, latitude, longitude }) => ({ id, latitude, longitude })) }))
      if (JSON.stringify(searches) !== JSON.stringify(raw.searches)) {
        try { storage()?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, searches })) } catch { /* Read-only storage. */ }
      }
      return searches
    } catch { return [] }
  }
  const persistMetadata = (key, dishId, data) => {
    const searches = readMetadata().filter(row => row.key !== key)
    searches.push({ key, dishId, createdAt: data.searchedAt,
      places: data.restaurants.map(({ id, latitude, longitude }) => ({ id, latitude, longitude })) })
    try { storage()?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, searches: searches.slice(-MAX_SEARCHES) })) } catch { /* Memory remains usable. */ }
  }
  const savedResult = row => present({ source: 'google-places', metadataOnly: true, searchedAt: row.createdAt,
    apiCalls: 0, restaurants: row.places.map(place => ({ ...place, placeId: place.id.slice(7), dishId: row.dishId,
      source: 'google-places', metadataOnly: true, name: 'Restaurant from your saved search', address: '',
      googleMapsUri: mapsUriForPlaceId(place.id), rating: null, userRatingCount: null, openNow: null,
      openingStatus: 'unknown', closingTime: null, openingHours: [], observedAt: row.createdAt,
      matchType: 'saved-search', attributions: [] })) }, {
        latitude: Number(row.key.split(':').at(-2)), longitude: Number(row.key.split(':').at(-1)),
      })

  const validateResult = (data, dishId) => {
    if (data?.source !== 'google-places' || !Array.isArray(data.restaurants) || data.restaurants.length > MAX_RESULTS
        || ![1, 2].includes(data.apiCalls) || !Number.isFinite(data.searchedAt)) throw new RestaurantSearchError('PROVIDER_UNAVAILABLE')
    for (const place of data.restaurants) {
      if (!isGoogleRestaurantId(place?.id) || place.id !== `google:${place.placeId}` || place.dishId !== dishId
          || typeof place.name !== 'string' || !place.name.trim() || !validCoordinates(place)
          || !safeMapsUri(place.googleMapsUri)
          || !['exact-dish-search', 'cuisine-fallback'].includes(place.matchType)) throw new RestaurantSearchError('PROVIDER_UNAVAILABLE')
    }
    return data
  }
  const join = (job, signal) => {
    if (signal?.aborted) return Promise.reject(abortError())
    job.consumers += 1
    return new Promise((resolve, reject) => {
      let complete = false
      const finish = (callback, value) => {
        if (complete) return
        complete = true; signal?.removeEventListener('abort', cancel); job.consumers -= 1
        if (!job.consumers && !job.settled) job.controller.abort()
        callback(value)
      }
      const cancel = () => finish(reject, abortError())
      signal?.addEventListener('abort', cancel, { once: true })
      job.promise.then(data => finish(resolve, data), error => finish(reject, error))
    })
  }

  return {
    getCachedByDish(dishId) {
      const rows = [...displayed.values()].filter(row => row.dishId === dishId && fresh(row)).sort((a, b) => b.createdAt - a.createdAt)
      if (rows.length) return { ...rows[0].data, apiCalls: 0 }
      const metadata = readMetadata().filter(row => row.dishId === dishId).sort((a, b) => b.createdAt - a.createdAt)[0]
      return metadata ? savedResult(metadata) : null
    },
    getById({ restaurantId, dishId }) {
      const rows = [...displayed.values()].filter(row => fresh(row) && (!dishId || row.dishId === dishId))
      for (const row of rows.reverse()) {
        const restaurant = row.data.restaurants.find(place => restaurantIdentityIds(place).includes(restaurantId))
        if (restaurant) return { ...restaurant }
      }
      for (const row of readMetadata().reverse()) {
        if (dishId && row.dishId !== dishId) continue
        const restaurant = savedResult(row).restaurants.find(place => place.id === restaurantId)
        if (restaurant) return restaurant
      }
      return null
    },
    async findByDish({ dishId, coordinates, signal, refresh = false }) {
      if (!canonicalIds.has(dishId) || !validCoordinates(coordinates)) throw new RestaurantSearchError('INVALID_REQUEST')
      signal?.throwIfAborted()
      const key = searchKey(dishId, coordinates)
      if (pending.has(key)) {
        const data = await join(pending.get(key), signal)
        return present(data, coordinates, data.apiCalls)
      }
      if (!refresh) {
        const row = displayed.get(key)
        if (fresh(row)) { diagnostic({ dishId, apiCalls: 0, source: 'displayed-result' }); return present(row.data, coordinates) }
        const metadata = readMetadata().find(row => row.key === key)
        if (metadata) { diagnostic({ dishId, apiCalls: 0, source: 'saved-place-ids' }); return present(savedResult(metadata), coordinates) }
      }
      const job = { controller: new AbortController(), consumers: 0, settled: false }
      const timer = setTimeout(() => job.controller.abort(), timeoutMs)
      job.promise = (async () => {
        try {
          const response = await fetchImpl('/api/nearby-restaurants', {
            method: 'POST', credentials: 'same-origin', signal: job.controller.signal,
            headers: { 'Content-Type': 'application/json', 'X-Nom-Nearby': '1' },
            body: JSON.stringify({ dishId, ...approximateArea(coordinates) }),
          })
          const data = await response.json()
          if (!response.ok) throw new RestaurantSearchError(data?.error?.code ?? 'PROVIDER_UNAVAILABLE')
          const selected = present(validateResult(data, dishId), coordinates, data.apiCalls)
          if (job.controller.signal.aborted) throw abortError()
          displayed.set(key, { dishId, createdAt: selected.searchedAt, data: selected })
          while (displayed.size > MAX_SEARCHES) displayed.delete(displayed.keys().next().value)
          persistMetadata(key, dishId, selected)
          diagnostic({ dishId, apiCalls: data.apiCalls, source: 'google-places', ...(import.meta.env.DEV && data.searchDebug ? { searchDebug: data.searchDebug, serverIds: data.restaurants.map(row => row.id), presentedIds: selected.restaurants.map(row => row.id) } : {}) })
          return selected
        } catch (error) {
          if (error instanceof RestaurantSearchError) throw error
          throw new RestaurantSearchError(job.controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR')
        } finally { clearTimeout(timer); job.settled = true; if (pending.get(key) === job) pending.delete(key) }
      })()
      pending.set(key, job)
      const data = await join(job, signal)
      return present(data, coordinates, data.apiCalls)
    },
    clear() { for (const job of pending.values()) job.controller.abort(); pending.clear(); displayed.clear() },
  }
}

let sessionCalls = 0
export const nearbyRestaurantService = createRestaurantSearchService({ diagnostic: data => {
  sessionCalls += data.apiCalls
  recordNearbyUsage('textSearchCalls', data.apiCalls)
  if (import.meta.env.DEV) console.debug('[Nom nearby]', { ...data, sessionCalls })
} })
