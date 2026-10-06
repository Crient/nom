import { NearbySearchError, GOOGLE_TIMEOUT_MS } from './googlePlacesProvider.js'
import { MAX_REVIEWS, PHOTO_WIDTH_PX, safeHttpsUri, safePhotoUri, safeWebsiteUri, phoneUri, validPhotoName, validPlaceId } from '../shared/placeMedia.js'
import { safeMapsUri } from '../shared/nearbyRestaurants.js'
import { placeExtraErrorInfo } from '../shared/placeExtrasErrors.js'

// One selected-place request supplies the designed detail screen and its reviews.
export const GOOGLE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,rating,userRatingCount,currentOpeningHours,nationalPhoneNumber,websiteUri,googleMapsLinks,priceLevel,primaryTypeDisplayName,editorialSummary,reviews,attributions'

export function normalizeDetails(data, observedAt) {
  const text = (value, limit) => typeof value === 'string' && value.length <= limit && value.trim() ? value : undefined
  const hours = data.currentOpeningHours
  return Object.fromEntries(Object.entries({
    name: text(data.displayName?.text, 300), address: text(data.formattedAddress, 1000),
    rating: Number.isFinite(data.rating) && data.rating >= 0 && data.rating <= 5 ? data.rating : undefined,
    userRatingCount: Number.isInteger(data.userRatingCount) && data.userRatingCount >= 0 ? data.userRatingCount : undefined,
    openNow: typeof hours?.openNow === 'boolean' ? hours.openNow : undefined,
    observedAt: typeof hours?.openNow === 'boolean' ? observedAt : undefined,
    openingHours: Array.isArray(hours?.weekdayDescriptions) ? hours.weekdayDescriptions.slice(0, 7).filter(value => text(value, 250)) : undefined,
    nationalPhoneNumber: phoneUri(data.nationalPhoneNumber) ? data.nationalPhoneNumber : undefined,
    websiteUri: safeWebsiteUri(data.websiteUri) ?? undefined,
    directionsUri: safeMapsUri(data.googleMapsLinks?.directionsUri) ?? undefined,
    priceLevel: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'].includes(data.priceLevel) ? data.priceLevel : undefined,
    primaryTypeDisplayName: text(data.primaryTypeDisplayName?.text, 150),
    editorialSummary: text(data.editorialSummary?.text, 10_000), editorialLanguage: text(data.editorialSummary?.languageCode, 50),
  }).filter(([, value]) => value !== undefined))
}

export function normalizeReview(review) {
  const author = review?.authorAttribution
  const authorUri = safeHttpsUri(author?.uri), googleMapsUri = safeMapsUri(review?.googleMapsUri)
  const original = review?.originalText?.text, localized = review?.text?.text
  const text = typeof original === 'string' ? original : localized
  if (typeof author?.displayName !== 'string' || !author.displayName.trim() || !authorUri || !googleMapsUri
      || (text !== undefined && (typeof text !== 'string' || text.length > 30_000))) return null
  const date = review.visitDate
  return { text: text ?? '', languageCode: review.originalText?.languageCode ?? review.text?.languageCode ?? null,
    translated: typeof original !== 'string' && !!review.originalText && localized !== original,
    rating: Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 ? review.rating : null,
    author: { displayName: author.displayName, uri: authorUri, photoUri: safePhotoUri(author.photoUri) }, googleMapsUri,
    relativeTime: typeof review.relativePublishTimeDescription === 'string' ? review.relativePublishTimeDescription : null,
    visitDate: Number.isInteger(date?.year) && date.year >= 1 && date.year <= 9999
      && Number.isInteger(date.month) && date.month >= 1 && date.month <= 12 ? { year: date.year, month: date.month } : null }
}

export function createGooglePlaceExtrasProvider({ fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = GOOGLE_TIMEOUT_MS } = {}) {
  async function request(url, { apiKey, signal, onCall = () => {}, fieldMask, photo = false }) {
    if (!apiKey) throw new NearbySearchError('NOT_CONFIGURED')
    if (signal?.aborted) throw Object.assign(new NearbySearchError('CANCELLED', 499), { source: 'network' })
    const controller = new AbortController(), cancel = () => controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(cancel, timeoutMs)
    try {
      onCall()
      const headers = { 'X-Goog-Api-Key': apiKey }
      if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask
      const response = await fetchImpl(url, { method: 'GET', headers, signal: controller.signal, redirect: 'error' })
      if (!response.ok) {
        // Photo 403 can mean quota OR permission. Inspect only structured enums,
        // never forward/log Google's message (which may contain a key or URL).
        let reason
        if (photo && response.status === 403) {
          try {
            const body = await response.json()
            const detail = body?.error?.details?.find(row => ['RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'DAILY_LIMIT_EXCEEDED', 'API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED', 'SERVICE_DISABLED'].includes(row?.reason))
            const quotaFailure = body?.error?.details?.some(row => row?.['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure')
            reason = placeExtraErrorInfo({ reason: detail?.reason ?? (quotaFailure ? 'QUOTA_EXCEEDED' : body?.error?.status) }).reason
          } catch { /* Non-JSON photo error: retain the ambiguous 403 status. */ }
        }
        const quota = response.status === 429 || ['RESOURCE_EXHAUSTED', 'RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'DAILY_LIMIT_EXCEEDED'].includes(reason)
        const retrySeconds = Number(response.headers?.get?.('Retry-After'))
        const retryAfterMs = quota ? Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : 60_000 : undefined
        const code = quota ? 'QUOTA_LIMIT' : photo && response.status === 400 ? 'PHOTO_RESOURCE_INVALID'
          : photo && response.status === 404 ? 'PHOTO_RESOURCE_UNAVAILABLE'
          : photo && response.status === 403 ? reason ? 'PHOTO_ACCESS_DENIED' : 'PHOTO_QUOTA_OR_ACCESS'
          : response.status === 403 ? 'PROVIDER_CONFIGURATION' : 'PROVIDER_UNAVAILABLE'
        throw Object.assign(new NearbySearchError(code, quota ? 429 : photo && [400, 404].includes(response.status) ? response.status : 503),
          { source: 'google', upstreamStatus: response.status, reason, retryAfterMs })
      }
      return await response.json()
    } catch (error) {
      if (signal?.aborted) throw Object.assign(new NearbySearchError('CANCELLED', 499), { source: 'network' })
      if (error instanceof NearbySearchError) throw error
      throw Object.assign(new NearbySearchError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR'), { source: 'network' })
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
  }
  return {
    async photo({ name, ...options }) {
      if (!validPhotoName(name)) throw new NearbySearchError('INVALID_REQUEST', 400)
      const url = new URL(`https://places.googleapis.com/v1/${name}/media`)
      url.searchParams.set('maxWidthPx', String(PHOTO_WIDTH_PX)); url.searchParams.set('skipHttpRedirect', 'true')
      const data = await request(url.href, { ...options, photo: true }), photoUri = safePhotoUri(data?.photoUri)
      if (!photoUri || photoUri.includes(options.apiKey)) throw new NearbySearchError('PROVIDER_UNAVAILABLE')
      return { photoUri, photoMediaCalls: 1 }
    },
    async details({ placeId, ...options }) {
      if (!validPlaceId(placeId)) throw new NearbySearchError('INVALID_REQUEST', 400)
      const data = await request(`https://places.googleapis.com/v1/places/${placeId}?languageCode=en`, { ...options, fieldMask: GOOGLE_DETAILS_FIELD_MASK })
      if (data?.id !== placeId || (data.reviews !== undefined && !Array.isArray(data.reviews))) throw new NearbySearchError('PROVIDER_UNAVAILABLE')
      return { placeId, details: normalizeDetails(data, now()), reviews: (data.reviews ?? []).map(normalizeReview).filter(Boolean).slice(0, MAX_REVIEWS),
        attributions: (Array.isArray(data.attributions) ? data.attributions : []).slice(0, 10).filter(item => typeof item?.provider === 'string').map(item => ({ provider: item.provider, providerUri: safeHttpsUri(item.providerUri) })),
        observedAt: now(), placeDetailsCalls: 1 }
    },
  }
}
