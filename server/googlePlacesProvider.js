import { dedupeRestaurants, ENOUGH_RESULTS, MAX_RESULTS, MAX_NEARBY_DISTANCE_MILES, PAGE_SIZE, SEARCH_RADIUS_METERS, haversineMiles, queriesForDish, safeMapsUri, textSearchMatchEvidence } from '../shared/nearbyRestaurants.js'
import { normalizePhoto } from '../shared/placeMedia.js'

export const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
export const GOOGLE_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.googleMapsUri', 'places.rating', 'places.userRatingCount',
  'places.currentOpeningHours', 'places.attributions', 'places.photos',
].join(',')
export const GOOGLE_TIMEOUT_MS = 8_000

export class NearbySearchError extends Error {
  constructor(code, status = 503) { super(code); this.name = 'NearbySearchError'; this.code = code; this.status = status }
}

const clean = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : ''
const safeAttributionUri = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}

export function normalizePlace(place, { dishId, cuisine, matchType, coordinates, observedAt }) {
  const id = clean(place?.id, 256), name = clean(place?.displayName?.text, 300)
  const latitude = place?.location?.latitude, longitude = place?.location?.longitude
  const distance = haversineMiles(coordinates, { latitude, longitude })
  const googleMapsUri = safeMapsUri(place?.googleMapsUri)
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(id) || !name || distance === null || distance > MAX_NEARBY_DISTANCE_MILES || !googleMapsUri) return null
  const hours = place.currentOpeningHours
  return {
    id: `google:${id}`, placeId: id, dishId, name, address: clean(place.formattedAddress, 1000),
    latitude, longitude, googleMapsUri, source: 'google-places', cuisine, matchType,
    matchEvidence: textSearchMatchEvidence(matchType),
    rating: Number.isFinite(place.rating) && place.rating >= 0 && place.rating <= 5 ? place.rating : null,
    userRatingCount: Number.isInteger(place.userRatingCount) && place.userRatingCount >= 0 ? place.userRatingCount : null,
    openNow: typeof hours?.openNow === 'boolean' ? hours.openNow : null,
    openingStatus: hours?.openNow === true ? 'open' : hours?.openNow === false ? 'closed' : 'unknown',
    // No venue timezone is requested. Never format a UTC closing timestamp as place-local time.
    closingTime: null, openingHours: Array.isArray(hours?.weekdayDescriptions)
      ? hours.weekdayDescriptions.slice(0, 7).map(value => clean(value, 250)).filter(Boolean) : [],
    observedAt, approximateDistanceMiles: distance,
    photo: Array.isArray(place.photos) ? place.photos.slice(0, 10).map(photo => normalizePhoto(photo, id, observedAt)).find(Boolean) ?? null : null,
    attributions: Array.isArray(place.attributions) ? place.attributions.slice(0, 10).map(item => ({
      provider: clean(item?.provider, 200), providerUri: safeAttributionUri(item?.providerUri),
    })).filter(item => item.provider) : [],
  }
}

/** Exactly one primary and optionally one sequential fallback; no details, retries or pagination. */
export function createGooglePlacesProvider({ fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = GOOGLE_TIMEOUT_MS } = {}) {
  return {
    async search({ dish, coordinates, apiKey, signal, onCall = () => {}, onDiagnostic }) {
      if (!apiKey) throw new NearbySearchError('NOT_CONFIGURED')
      const queries = queriesForDish(dish)
      // Optional observer only: never changes queries, budgets, or result selection.
      const trace = onDiagnostic ? event => { try { onDiagnostic(event) } catch { /* Debugging cannot fail search. */ } } : null
      trace?.({ stage: 'plan', dishId: dish.id, queries, fallbackThreshold: ENOUGH_RESULTS,
        radiusMeters: SEARCH_RADIUS_METERS, distanceCapMiles: MAX_NEARBY_DISTANCE_MILES,
        nearbyFallback: 'not implemented', matchFiltering: 'none; query provenance only',
        mediaFiltering: 'none; photo/detail failures cannot remove a search result' })
      let apiCalls = 0
      const textSearch = async (textQuery, matchType) => {
        signal?.throwIfAborted()
        const controller = new AbortController()
        const cancel = () => controller.abort(signal?.reason)
        signal?.addEventListener('abort', cancel, { once: true })
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        try {
          onCall(); apiCalls += 1
          trace?.({ stage: 'query-sent', textQuery, matchType })
          const response = await fetchImpl(GOOGLE_TEXT_SEARCH_URL, {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GOOGLE_FIELD_MASK },
            body: JSON.stringify({ textQuery, includedType: 'restaurant', strictTypeFiltering: true,
              pageSize: PAGE_SIZE, languageCode: 'en', includePureServiceAreaBusinesses: false,
              locationBias: { circle: { center: coordinates, radius: SEARCH_RADIUS_METERS } } }),
          })
          if (!response.ok) {
            // Never echo Google's response body, which may contain configuration or credential data.
            throw new NearbySearchError(response.status === 429 ? 'QUOTA_LIMIT' : [401, 403].includes(response.status)
              ? 'PROVIDER_CONFIGURATION' : response.status === 400 ? 'PROVIDER_REQUEST' : 'PROVIDER_UNAVAILABLE', response.status === 429 ? 429 : 503)
          }
          const body = await response.json()
          if (body.places !== undefined && !Array.isArray(body.places)) throw new NearbySearchError('PROVIDER_UNAVAILABLE')
          const candidates = [], observedAt = now()
          for (const place of (body.places ?? []).slice(0, PAGE_SIZE)) {
            const result = normalizePlace(place, { dishId: dish.id, cuisine: queries.cuisine, matchType, coordinates, observedAt })
            if (result) candidates.push(result)
          }
          const unique = dedupeRestaurants(candidates)
          if (trace) trace({ stage: 'query-response', textQuery, matchType,
            rawPlaces: body.places ?? [], normalized: (body.places ?? []).map((place, index) => {
              const distance = haversineMiles(coordinates, place?.location)
              const result = index < PAGE_SIZE ? normalizePlace(place, { dishId: dish.id, cuisine: queries.cuisine, matchType, coordinates, observedAt }) : null
              const reason = result ? 'accepted' : index >= PAGE_SIZE ? 'page-size-limit'
                : !/^[A-Za-z0-9_-]{1,256}$/.test(clean(place?.id, 256)) ? 'invalid-place-id'
                : !clean(place?.displayName?.text, 300) ? 'missing-name'
                : distance === null ? 'invalid-coordinates' : distance > MAX_NEARBY_DISTANCE_MILES ? 'distance-cap'
                : !safeMapsUri(place?.googleMapsUri) ? 'invalid-maps-uri' : 'normalization'
              return { placeId: place?.id ?? null, name: place?.displayName?.text ?? null, distanceMiles: distance, reason }
            }), deduped: unique.map(({ id, aliasIds }) => ({ id, aliasIds: aliasIds ?? [id] })) })
          return unique
        } catch (error) {
          if (signal?.aborted) throw new NearbySearchError('CANCELLED', 499)
          if (error instanceof NearbySearchError) throw error
          throw new NearbySearchError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR')
        } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
      }
      const primary = await textSearch(queries.primary, 'exact-dish-search')
      let combined = primary
      let partialError = null
      trace?.({ stage: 'fallback-decision', used: primary.length < ENOUGH_RESULTS, acceptedPrimaryCount: primary.length, textQuery: queries.fallback })
      if (primary.length < ENOUGH_RESULTS) {
        try {
          combined = dedupeRestaurants([...primary, ...await textSearch(queries.fallback, 'cuisine-fallback')])
        } catch (error) {
          if (!primary.length || signal?.aborted) throw error
          partialError = error.code ?? 'PROVIDER_UNAVAILABLE'
        }
      }
      const ranked = combined.sort((a, b) => a.approximateDistanceMiles - b.approximateDistanceMiles)
      trace?.({ stage: 'ranked-results', partialError, ranking: 'ascending-distance', limit: MAX_RESULTS,
        candidates: ranked.map(({ id, name, approximateDistanceMiles, aliasIds }, index) => ({ id, name,
          aliasIds: aliasIds ?? [id], distanceMiles: approximateDistanceMiles, rank: index + 1,
          disposition: index < MAX_RESULTS ? 'returned' : 'result-limit' })) })
      return { restaurants: ranked.slice(0, MAX_RESULTS), source: 'google-places',
        cuisine: queries.cuisine, apiCalls, partialError, searchedAt: now() }
    },
  }
}
