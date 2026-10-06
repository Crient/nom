import { MEDIA_SESSION_TTL_MS, safePhotoUri, validPhotoName, validPlaceId } from '../../shared/placeMedia.js'
import { recordNearbyUsage, recordPlaceMediaDiagnostic } from './nearbyUsage'
import { placeExtraErrorInfo, PHOTO_RESOURCE_ERRORS } from '../../shared/placeExtrasErrors.js'

const IDLE = Object.freeze({ status: 'idle' })
export function createPlaceExtrasService(kind, { fetchImpl = (...args) => globalThis.fetch(...args), now = Date.now,
  diagnostic = recordNearbyUsage, errorDiagnostic = recordPlaceMediaDiagnostic, timeoutMs = 10_000 } = {}) {
  const state = new Map(), pending = new Map(), listeners = new Map()
  let photoQuotaPause = null
  const field = kind === 'photo' ? 'name' : 'placeId', counter = kind === 'photo' ? 'photoMediaCalls' : 'placeDetailsCalls'
  const keyFor = value => kind === 'photo' ? value?.name : value
  const notify = (key, value) => { state.set(key, value); for (const callback of listeners.get(key) ?? []) callback() }
  const snapshot = key => {
    const row = state.get(key)
    if (row && row.status !== 'loading' && (now() < row.receivedAt || now() - row.receivedAt >= MEDIA_SESSION_TTL_MS)) state.delete(key)
    return state.get(key) ?? IDLE
  }
  return {
    getSnapshot: snapshot,
    subscribe(key, callback) {
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key).add(callback)
      return () => { listeners.get(key)?.delete(callback) }
    },
    load(value, { retry = false } = {}) {
      const key = keyFor(value)
      if (!(kind === 'photo' ? validPhotoName(key) : validPlaceId(key))) return Promise.resolve(null)
      if (pending.has(key)) return pending.get(key).promise
      const previous = snapshot(key)
      const freshPhoto = kind === 'photo' && Number.isFinite(value.observedAt)
        && value.observedAt <= now() && now() - value.observedAt < MEDIA_SESSION_TTL_MS
      const reobservedPhoto = freshPhoto && previous.status === 'error' && PHOTO_RESOURCE_ERRORS.has(previous.errorCode)
        && (previous.errorCode === 'PHOTO_STALE' || value.observedAt > previous.observedAt)
      if (previous.retryAt > now()) { diagnostic(counter, 0); return Promise.resolve(null) }
      if (previous.status !== 'idle' && !reobservedPhoto && !(retry && previous.status === 'error')) { diagnostic(counter, 0); return Promise.resolve(previous.data ?? null) }
      if (kind === 'photo' && !freshPhoto) {
        errorDiagnostic({ kind, code: 'PHOTO_STALE', source: 'metadata', calls: 0 })
        notify(key, { status: 'error', errorCode: 'PHOTO_STALE', observedAt: value.observedAt, receivedAt: now() }); return Promise.resolve(null)
      }
      // Once quota is confirmed, new visible thumbnails share the pause. Keep
      // ready images and in-flight jobs usable; do not cancel or auto-retry them.
      if (kind === 'photo' && photoQuotaPause?.retryAt > now()) {
        diagnostic(counter, 0)
        notify(key, { ...photoQuotaPause, observedAt: value.observedAt, receivedAt: now() })
        return Promise.resolve(null)
      }
      const job = { controller: new AbortController() }
      pending.set(key, job); notify(key, { status: 'loading' })
      const timer = setTimeout(() => job.controller.abort(), timeoutMs)
      job.promise = (async () => {
        let httpStatus, failureInfo, calls
        try {
          const response = await fetchImpl(`/api/place-${kind === 'photo' ? 'photo' : 'details'}`, {
            method: 'POST', credentials: 'same-origin', signal: job.controller.signal,
            headers: { 'Content-Type': 'application/json', 'X-Nom-Nearby': '1' }, body: JSON.stringify({ [field]: key }),
          })
          httpStatus = response.status
          const data = await response.json()
          calls = [0, 1].includes(data?.[counter]) ? data[counter] : undefined
          if ([0, 1].includes(data?.[counter])) diagnostic(counter, data[counter])
          if (!response.ok) { failureInfo = placeExtraErrorInfo(data?.error); throw new Error(failureInfo.code) }
          if (data?.[counter] !== 1 || (kind === 'photo' ? !safePhotoUri(data.photoUri)
            : data.placeId !== key || !Array.isArray(data.reviews) || data.reviews.length > 3)) { failureInfo = { code: 'INVALID_RESPONSE', source: 'endpoint' }; throw new Error('INVALID_RESPONSE') }
          if (job.controller.signal.aborted || pending.get(key) !== job) return null
          notify(key, { status: 'ready', data, receivedAt: now() }); return data
        } catch (error) {
          if (pending.get(key) === job) {
            const info = failureInfo ?? { code: job.controller.signal.aborted ? 'TIMEOUT' : error.name === 'AbortError' ? 'CANCELLED' : httpStatus ? 'INVALID_RESPONSE' : 'NETWORK_ERROR', source: httpStatus ? 'endpoint' : 'network' }
            const safeInfo = placeExtraErrorInfo(info)
            errorDiagnostic({ kind, ...safeInfo, ...(httpStatus ? { httpStatus } : {}), ...(calls !== undefined ? { calls } : {}) })
            const failure = { status: 'error', errorCode: safeInfo.code, errorInfo: safeInfo, httpStatus, observedAt: value?.observedAt,
              retryAt: safeInfo.retryAfterMs ? now() + safeInfo.retryAfterMs : safeInfo.code === 'QUOTA_LIMIT' ? now() + 60_000 : 0, receivedAt: now() }
            if (kind === 'photo' && safeInfo.code === 'QUOTA_LIMIT' && failure.retryAt > (photoQuotaPause?.retryAt ?? 0)) photoQuotaPause = failure
            notify(key, failure)
          }
          return null
        } finally { clearTimeout(timer); if (pending.get(key) === job) pending.delete(key) }
      })()
      return job.promise
    },
    clear() { for (const job of pending.values()) job.controller.abort(); pending.clear(); state.clear(); listeners.clear(); photoQuotaPause = null },
  }
}
export const placePhotoService = createPlaceExtrasService('photo')
export const placeDetailsService = createPlaceExtrasService('details')
// Called by explicit card / marker / preview selection, never by render or mount.
export function selectRestaurantDetails(restaurant) {
  if (restaurant?.source === 'google-places' && !restaurant.metadataOnly) placeDetailsService.load(restaurant.placeId)
}
