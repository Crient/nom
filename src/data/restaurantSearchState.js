import { findRestaurantsForDish, selectRestaurants } from './restaurantProvider'
import { nearbyRestaurantService, RestaurantSearchError } from './nearbyRestaurantService'
import { CACHE_TTL_MS, dedupeRestaurants, MAX_NEARBY_DISTANCE_MILES, approximateArea, haversineMiles, searchKey, validCoordinates } from '../../shared/nearbyRestaurants.js'

export function currentCoordinates({ signal, geolocation = globalThis.navigator?.geolocation, timeoutMs = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'))
    if (!geolocation) return reject(new RestaurantSearchError('LOCATION_UNAVAILABLE'))
    let complete = false
    const finish = (callback, value) => {
      if (complete) return
      complete = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel); callback(value)
    }
    const cancel = () => finish(reject, new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(reject, new RestaurantSearchError('LOCATION_TIMEOUT')), timeoutMs)
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      geolocation.getCurrentPosition(position => {
        const coordinates = { latitude: position.coords?.latitude, longitude: position.coords?.longitude }
        finish(validCoordinates(coordinates) ? resolve : reject,
          validCoordinates(coordinates) ? coordinates : new RestaurantSearchError('LOCATION_ERROR'))
      }, error => finish(reject, new RestaurantSearchError(error.code === 1 ? 'LOCATION_DENIED'
        : error.code === 2 ? 'LOCATION_UNAVAILABLE' : error.code === 3 ? 'LOCATION_TIMEOUT' : 'LOCATION_ERROR')),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 })
    } catch { finish(reject, new RestaurantSearchError('LOCATION_ERROR')) }
  })
}

const EMPTY = Object.freeze({ status: 'idle', locationStatus: 'not-requested', restaurants: [] })
export function createRestaurantSearchState({ provider = request => findRestaurantsForDish(request),
  locate = currentCoordinates, getCached = id => nearbyRestaurantService.getCachedByDish(id), now = Date.now } = {}) {
  const state = new Map(), listeners = new Map(), jobs = new Map(), locationChecks = new Map(), cachedRestaurants = new Map()
  let locationGranted = false
  const notify = (id, result) => { state.set(id, result); for (const callback of listeners.get(id) ?? []) callback() }
  return {
    getSnapshot(id) {
      if (!id) return EMPTY
      const previous = state.get(id)
      if (previous?.status === 'ready' && previous.source === 'google-places'
          && (!Number.isFinite(previous.searchedAt) || previous.searchedAt > now() || now() - previous.searchedAt >= CACHE_TTL_MS)) state.delete(id)
      if (!state.has(id)) {
        const cached = getCached(id)
        const restaurants = cached ? dedupeRestaurants(cached.restaurants) : []
        if (cached) cachedRestaurants.set(id, restaurants)
        state.set(id, cached ? { ...cached, restaurants: selectRestaurants(restaurants), status: 'ready', locationStatus: 'not-requested' } : EMPTY)
      }
      return state.get(id)
    },
    subscribe(id, callback) {
      if (!listeners.has(id)) listeners.set(id, new Set())
      listeners.get(id).add(callback)
      if (jobs.has(id)) jobs.get(id).handoff = false
      return () => {
        listeners.get(id)?.delete(callback)
        // Allow the Dish Details -> Nearby transition to attach to the same deliberately started search.
        setTimeout(() => {
          const job = jobs.get(id)
          if (!listeners.get(id)?.size && !job?.handoff) job?.controller.abort()
        }, 0)
      }
    },
    search(id, { refresh = false, handoff = false } = {}) {
      if (!id) return Promise.resolve()
      if (jobs.has(id)) return jobs.get(id).promise
      const controller = new AbortController(), job = { controller, handoff }
      jobs.set(id, job)
      notify(id, { status: 'requesting-location', locationStatus: 'requesting', restaurants: [] })
      job.promise = (async () => {
        try {
          const coordinates = await locate({ signal: controller.signal })
          locationGranted = true
          if (controller.signal.aborted || jobs.get(id) !== job) return
          notify(id, { status: 'loading', locationStatus: 'granted', restaurants: [] })
          const data = await provider({ dishId: id, coordinates, signal: controller.signal, refresh })
          if (!controller.signal.aborted && jobs.get(id) === job) {
            const restaurants = dedupeRestaurants(data.restaurants)
            cachedRestaurants.set(id, restaurants)
            notify(id, { ...data, searchArea: approximateArea(coordinates), restaurants: selectRestaurants(restaurants), status: 'ready', locationStatus: 'granted' })
          }
        } catch (error) {
          if (jobs.get(id) !== job) return
          if (controller.signal.aborted) { notify(id, EMPTY); return }
          const code = error.code ?? 'NETWORK_ERROR'
          const locationStatus = ({ LOCATION_DENIED: 'denied', LOCATION_UNAVAILABLE: 'unavailable', LOCATION_TIMEOUT: 'timeout', LOCATION_ERROR: 'error' })[code] ?? 'granted'
          notify(id, { status: 'error', locationStatus, errorCode: code, restaurants: [] })
        } finally { if (jobs.get(id) === job) jobs.delete(id) }
      })()
      return job.promise
    },
    async autoSearch(id, { signal, permissions = globalThis.navigator?.permissions } = {}) {
      if (!id || signal?.aborted || this.getSnapshot(id).status !== 'idle') return
      let permission = locationGranted ? 'granted' : 'prompt'
      try { if (permissions?.query) permission = (await permissions.query({ name: 'geolocation' })).state } catch { /* Unsupported permission query: reuse only a successful session grant. */ }
      if (signal?.aborted || this.getSnapshot(id).status !== 'idle') return
      if (permission === 'denied') {
        notify(id, { status: 'error', locationStatus: 'denied', errorCode: 'LOCATION_DENIED', restaurants: [] })
      } else if (permission === 'granted') return this.search(id)
    },
    revalidateCached(id, { signal, permissions = globalThis.navigator?.permissions } = {}) {
      const cached = this.getSnapshot(id)
      if (!id || signal?.aborted || cached.status !== 'ready' || cached.source !== 'google-places') return Promise.resolve()
      if (locationChecks.has(id)) return locationChecks.get(id).promise
      const job = { controller: new AbortController() }
      locationChecks.set(id, job)
      const checking = { ...cached, revalidatingLocation: true,
        locationNotice: 'Checking your current area. Cached distances use the last search location.' }
      notify(id, checking)
      const stillCurrent = () => locationChecks.get(id) === job && state.get(id) === checking
      job.promise = (async () => {
        try {
          let permission = locationGranted ? 'granted' : 'prompt'
          try { if (permissions?.query) permission = (await permissions.query({ name: 'geolocation' })).state } catch { /* Reuse a session grant without prompting. */ }
          if (!stillCurrent() || (signal?.aborted && !listeners.get(id)?.size)) return
          if (permission !== 'granted') {
            notify(id, { ...cached, revalidatingLocation: false,
              locationNotice: 'Cached distances use your last search location. Refresh to check your current area.' })
            return
          }
          // Recalculate locally: moving never silently triggers a billable Places search.
          const coordinates = await locate({ signal: job.controller.signal })
          if (!stillCurrent() || job.controller.signal.aborted) return
          const restaurants = (cachedRestaurants.get(id) ?? cached.restaurants).map(restaurant => ({ ...restaurant,
            approximateDistanceMiles: haversineMiles(coordinates, restaurant) }))
            .filter(restaurant => Number.isFinite(restaurant.approximateDistanceMiles) && restaurant.approximateDistanceMiles <= MAX_NEARBY_DISTANCE_MILES)
          const previousSearchArea = Boolean(cached.searchArea && searchKey(id, coordinates) !== searchKey(id, cached.searchArea))
          notify(id, { ...cached, restaurants: selectRestaurants(restaurants), apiCalls: 0,
            revalidatingLocation: false, locationStatus: 'granted', previousSearchArea,
            locationNotice: previousSearchArea ? 'These matches came from your previous search area. Refresh for places near your current location.' : null })
        } catch (error) {
          if (stillCurrent() && !job.controller.signal.aborted) notify(id, { ...cached, revalidatingLocation: false,
            locationNotice: 'Your current location could not be checked. Cached distances use your last search location.' })
        } finally {
          if (stillCurrent()) notify(id, { ...cached, revalidatingLocation: false })
          if (locationChecks.get(id) === job) locationChecks.delete(id)
        }
      })()
      return job.promise
    },
    reset() {
      for (const job of [...jobs.values(), ...locationChecks.values()]) job.controller.abort()
      jobs.clear(); locationChecks.clear(); cachedRestaurants.clear(); state.clear(); listeners.clear(); locationGranted = false
    },
  }
}

export const restaurantSearchState = createRestaurantSearchState()
