import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRestaurantSearchService } from './nearbyRestaurantService'
import { currentCoordinates, createRestaurantSearchState } from './restaurantSearchState'
import { CACHE_TTL_MS } from '../../shared/nearbyRestaurants.js'

const coordinates = { latitude: 40.123456, longitude: -75.234567 }
const initialTime = 1_790_000_000_000
const restaurant = { id: 'google:fixture-a', placeId: 'fixture-a', dishId: 'lort-cha', name: 'Fixture restaurant',
  latitude: 40.125, longitude: -75.235, googleMapsUri: 'https://maps.google.com/?cid=1', source: 'google-places',
  matchType: 'exact-dish-search', cuisine: 'Cambodian', rating: 4.6, userRatingCount: 269, address: 'Fixture address',
  observedAt: initialTime, openNow: true, openingHours: ['Monday: 10 AM–10 PM'], attributions: [] }
function setup(options = {}) {
  let time = initialTime
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const data = () => ({ source: 'google-places', restaurants: [restaurant], searchedAt: time, apiCalls: 2 })
  const fetch = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => data() }))
  const settings = { fetchImpl: fetch, now: () => time, storage: () => storage, ...options }
  return { service: createRestaurantSearchService(settings), fetch, settings, values,
    advance: ms => { time += ms }, data }
}
const search = service => service.findByDish({ dishId: 'lort-cha', coordinates })
afterEach(() => vi.useRealTimers())

describe('deliberate client search, cache and deduplication', () => {
  it('tolerates duplicated response rows and selects richer aliases across memory and durable restore', async () => {
    const duplicate = { ...restaurant, rating: null, userRatingCount: null, openingHours: [], openNow: null }
    const alias = { ...restaurant, id: 'google:alias', placeId: 'alias', name: 'FIXTURE RESTAURANT', address: 'Fixture address.' }
    const { service, settings, fetch, values } = setup({ fetchImpl: vi.fn(async () => ({ ok: true, json: async () => ({ source: 'google-places',
      restaurants: [duplicate, restaurant, alias], searchedAt: initialTime, apiCalls: 1 }) })) })
    for (const result of [await search(service), await search(service), await search(createRestaurantSearchService(settings))]) expect(result.restaurants).toHaveLength(1)
    expect(service.getCachedByDish('lort-cha').restaurants[0].rating).toBe(4.6)
    expect(service.getById({ restaurantId: restaurant.id }).name).toBe(restaurant.name)
    expect(service.getById({ restaurantId: 'google:alias' }).id).toBe(restaurant.id)
    expect(service.getCachedByDish('lort-cha').restaurants[0].aliasIds).toContain('google:alias')
    expect([...values.values()][0]).not.toMatch(/Fixture|rating|photo/)
    expect([...values.values()][0]).not.toContain('aliasIds')
    expect(settings.fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('repairs duplicated stored Place IDs before showing restored results without fetching', async () => {
    const { service, settings, values, fetch } = setup()
    await search(service)
    const [key, raw] = [...values.entries()][0], stored = JSON.parse(raw)
    stored.searches[0].places.push({ ...stored.searches[0].places[0] })
    values.set(key, JSON.stringify(stored))
    const restored = createRestaurantSearchService(settings).getCachedByDish('lort-cha')
    expect(restored.restaurants).toHaveLength(1)
    expect(JSON.parse(values.get(key)).searches[0].places).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('derives unconfirmed evidence locally instead of accepting an upstream confirmation field', async () => {
    const { service } = setup({ fetchImpl: async () => ({ ok: true, json: async () => ({ source: 'google-places',
      restaurants: [{ ...restaurant, matchEvidence: 'confirmed-menu-item' }], searchedAt: initialTime, apiCalls: 1 }) }) })
    expect((await search(service)).restaurants[0].matchEvidence).toBe('exact-search-match')
  })
  it('filters global results and sorts closest first in responses, memory and saved-ID caches', async () => {
    const venues = [
      { ...restaurant, id: 'google:farther', placeId: 'farther', address: 'A different venue', latitude: 42.6 },
      { ...restaurant },
      { ...restaurant, id: 'google:global', placeId: 'global', latitude: 0, longitude: 100 },
    ]
    const transport = vi.fn(async () => ({ ok: true, json: async () => ({ source: 'google-places',
      restaurants: venues, searchedAt: initialTime, apiCalls: 1 }) }))
    const { service, settings } = setup({ fetchImpl: transport })
    for (const result of [await search(service), await search(service), await search(createRestaurantSearchService(settings))]) {
      expect(result.restaurants.map(venue => venue.placeId)).toEqual(['fixture-a', 'farther'])
      expect(result.restaurants.every(venue => venue.approximateDistanceMiles <= 250)).toBe(true)
    }
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('never requests anything when instantiated or reading a missing cache', () => {
    const { service, fetch } = setup()
    expect(service.getCachedByDish('lort-cha')).toBeNull()
    expect(service.getById({ restaurantId: 'google:fixture-a', dishId: 'lort-cha' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('sends only the canonical ID and rounded area to the same-origin server', async () => {
    const { service, fetch } = setup()
    const result = await search(service)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe('/api/nearby-restaurants')
    expect(request.headers).toEqual({ 'Content-Type': 'application/json', 'X-Nom-Nearby': '1' })
    expect(JSON.parse(request.body)).toEqual({ dishId: 'lort-cha', latitude: 40.12, longitude: -75.23 })
    expect(result.restaurants[0].approximateDistanceMiles).toBeGreaterThan(0)
    expect(result.apiCalls).toBe(2)
  })
  it('reuses displayed results for 24 hours with zero further calls', async () => {
    const { service, fetch, advance } = setup()
    await search(service); advance(CACHE_TTL_MS - 1)
    expect(await search(service)).toMatchObject({ apiCalls: 0, restaurants: [expect.objectContaining({ name: restaurant.name })] })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('allows a new deliberate search after expiry and purges expired stored coordinates', async () => {
    const { service, fetch, advance, values } = setup()
    await search(service); advance(CACHE_TTL_MS)
    expect(service.getCachedByDish('lort-cha')).toBeNull()
    expect([...values.values()][0]).not.toContain('40.125')
    await search(service)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('persists only permitted IDs and venue coordinates, not Google names/addresses/ratings/hours', async () => {
    const { service, values, settings, fetch } = setup()
    await search(service)
    const raw = [...values.values()][0]
    expect(raw).toContain('google:fixture-a')
    for (const forbidden of ['Fixture restaurant', 'Fixture address', 'rating', 'openingHours', '10 PM', 'googleMapsUri', 'test-key']) expect(raw).not.toContain(forbidden)
    const reloaded = createRestaurantSearchService(settings)
    const cached = await search(reloaded)
    expect(cached.apiCalls).toBe(0)
    expect(cached.metadataOnly).toBe(true)
    expect(cached.restaurants[0]).toMatchObject({ name: 'Restaurant from your saved search', rating: null, openNow: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    await reloaded.findByDish({ dishId: 'lort-cha', coordinates, refresh: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('buckets nearby user coordinates together, but separates distant areas and dishes', async () => {
    const { service, fetch, data } = setup()
    await search(service)
    await service.findByDish({ dishId: 'lort-cha', coordinates: { latitude: 40.124, longitude: -75.234 } })
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockImplementation(async (_, request) => ({ ok: true, json: async () => ({ ...data(), restaurants: [{ ...restaurant, dishId: JSON.parse(request.body).dishId }] }) }))
    await service.findByDish({ dishId: 'lort-cha', coordinates: { latitude: 41, longitude: -75 } })
    await service.findByDish({ dishId: 'ramen', coordinates })
    expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('deduplicates an in-flight search, including repeated refresh taps', async () => {
    const { service, fetch, data } = setup()
    let complete
    fetch.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const a = search(service), b = service.findByDish({ dishId: 'lort-cha', coordinates, refresh: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    complete({ ok: true, json: async () => data() })
    expect((await Promise.all([a, b])).map(row => row.apiCalls)).toEqual([2, 2])
  })
  it('one cancelled consumer does not cancel another consumer of the same request', async () => {
    const { service, fetch, data } = setup()
    let complete
    fetch.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const controller = new AbortController()
    const a = service.findByDish({ dishId: 'lort-cha', coordinates, signal: controller.signal }), b = search(service)
    const failure = expect(a).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); await failure
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false)
    complete({ ok: true, json: async () => data() })
    expect((await b).restaurants).toHaveLength(1)
  })
  it('cancels transport when every consumer leaves and does not save that response', async () => {
    const { service, fetch } = setup()
    fetch.mockImplementation((_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))))
    const controller = new AbortController()
    const failure = expect(service.findByDish({ dishId: 'lort-cha', coordinates, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); await failure
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(service.getCachedByDish('lort-cha')).toBeNull()
  })
  it.each(['QUOTA_LIMIT', 'PROVIDER_CONFIGURATION', 'NOT_CONFIGURED'])('does not retry or cache server %s errors', async code => {
    const { service, fetch } = setup()
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: { code } }) })
    await expect(search(service)).rejects.toMatchObject({ code })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(service.getCachedByDish('lort-cha')).toBeNull()
  })
  it('survives corrupt or unavailable browser storage', async () => {
    for (const storage of [() => { throw new Error('disabled') }, () => ({ getItem: () => '{broken', setItem: () => { throw new Error('full') } })]) {
      const { service, fetch } = setup({ storage })
      await search(service); await search(service)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  })
  it('does not send unknown dishes or invalid coordinates', async () => {
    const { service, fetch } = setup()
    await expect(service.findByDish({ dishId: 'missing', coordinates })).rejects.toThrow()
    await expect(service.findByDish({ dishId: 'lort-cha', coordinates: { latitude: 100, longitude: 0 } })).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects malformed provider data and dangerous Maps links', async () => {
    const { service, fetch, data } = setup()
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...data(), restaurants: [{ ...restaurant, googleMapsUri: 'javascript:alert(1)' }] }) })
    await expect(search(service)).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' })
    expect(service.getCachedByDish('lort-cha')).toBeNull()
  })
  it('announces 0/1/2 calls in development diagnostics without request secrets or precise coordinates', async () => {
    const diagnostic = vi.fn(), { service, fetch, data } = setup({ diagnostic })
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...data(), apiCalls: 1 }) })
    await search(service); await search(service)
    fetch.mockResolvedValue({ ok: true, json: async () => data() })
    await service.findByDish({ dishId: 'lort-cha', coordinates, refresh: true })
    expect(diagnostic.mock.calls.map(([row]) => row.apiCalls)).toEqual([1, 0, 2])
    expect(JSON.stringify(diagnostic.mock.calls)).not.toMatch(/latitude|longitude|apiKey|X-Goog/)
  })
})

describe('location and intent state', () => {
  it('expires displayed UI state after 24 hours without automatically searching', async () => {
    let time = 1_790_000_000_000
    const provider = vi.fn().mockImplementation(async () => ({ source: 'google-places', restaurants: [restaurant], searchedAt: time }))
    const locate = vi.fn().mockResolvedValue(coordinates)
    const state = createRestaurantSearchState({ provider, locate, getCached: () => null, now: () => time })
    await state.search('lort-cha')
    expect(state.getSnapshot('lort-cha').status).toBe('ready')
    time += CACHE_TTL_MS
    expect(state.getSnapshot('lort-cha').status).toBe('idle')
    expect(provider).toHaveBeenCalledTimes(1)
    expect(locate).toHaveBeenCalledTimes(1)
    await state.search('lort-cha')
    expect(provider).toHaveBeenCalledTimes(2)
  })
  it('reads idle state and subscribes without requesting location or restaurants', () => {
    const locate = vi.fn(), provider = vi.fn(), state = createRestaurantSearchState({ locate, provider, getCached: () => null })
    expect(state.getSnapshot('lort-cha')).toMatchObject({ status: 'idle', locationStatus: 'not-requested' })
    const unsubscribe = state.subscribe('lort-cha', () => {})
    expect(locate).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled(); unsubscribe()
  })
  it('finds location then searches once only after an explicit action, restraining duplicate taps', async () => {
    let grant
    const locate = vi.fn().mockImplementation(() => new Promise(resolve => { grant = resolve })), provider = vi.fn().mockResolvedValue({ source: 'google-places', restaurants: [], searchedAt: Date.now() })
    const state = createRestaurantSearchState({ locate, provider, getCached: () => null })
    const a = state.search('lort-cha'), b = state.search('lort-cha')
    expect(a).toBe(b)
    expect(state.getSnapshot('lort-cha')).toMatchObject({ status: 'requesting-location', locationStatus: 'requesting' })
    expect(provider).not.toHaveBeenCalled()
    grant(coordinates); await a
    expect(provider).toHaveBeenCalledTimes(1)
    expect(state.getSnapshot('lort-cha')).toMatchObject({ status: 'ready', locationStatus: 'granted' })
  })
  it.each([[1, 'LOCATION_DENIED'], [2, 'LOCATION_UNAVAILABLE'], [3, 'LOCATION_TIMEOUT'], [99, 'LOCATION_ERROR']])('maps location error %s correctly', async (code, expected) => {
    const geolocation = { getCurrentPosition: (_, reject) => reject({ code }) }
    await expect(currentCoordinates({ geolocation })).rejects.toMatchObject({ code: expected })
  })
  it('handles unavailable geolocation and invalid coordinate responses', async () => {
    await expect(currentCoordinates({ geolocation: null })).rejects.toMatchObject({ code: 'LOCATION_UNAVAILABLE' })
    await expect(currentCoordinates({ geolocation: { getCurrentPosition: resolve => resolve({ coords: { latitude: 99, longitude: 0 } }) } })).rejects.toMatchObject({ code: 'LOCATION_ERROR' })
  })
  it('times out if the browser never calls either location callback', async () => {
    vi.useFakeTimers()
    const failure = expect(currentCoordinates({ geolocation: { getCurrentPosition: () => {} } })).rejects.toMatchObject({ code: 'LOCATION_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(10_000); await failure
  })
  it('does not make provider calls or retry automatically after denied permission', async () => {
    const locate = vi.fn().mockRejectedValue({ code: 'LOCATION_DENIED' }), provider = vi.fn()
    const state = createRestaurantSearchState({ locate, provider, getCached: () => null })
    await state.search('lort-cha')
    expect(state.getSnapshot('lort-cha')).toMatchObject({ status: 'error', locationStatus: 'denied' })
    state.getSnapshot('lort-cha'); state.subscribe('lort-cha', () => {})
    expect(locate).toHaveBeenCalledTimes(1); expect(provider).not.toHaveBeenCalled()
  })
  it('preserves an explicit navigation handoff but cancels a later abandoned search', async () => {
    vi.useFakeTimers()
    let grant, signal
    const state = createRestaurantSearchState({ locate: vi.fn(request => {
      signal = request.signal; return new Promise(resolve => { grant = resolve })
    }), provider: vi.fn().mockResolvedValue({ restaurants: [], source: 'google-places' }), getCached: () => null })
    const leaveDetail = state.subscribe('lort-cha', () => {})
    const search = state.search('lort-cha', { handoff: true })
    leaveDetail(); await vi.advanceTimersByTimeAsync(10)
    expect(signal.aborted).toBe(false)
    const leaveNearby = state.subscribe('lort-cha', () => {})
    leaveNearby(); await vi.advanceTimersByTimeAsync(10)
    expect(signal.aborted).toBe(true)
    grant(coordinates); await search
  })
})
