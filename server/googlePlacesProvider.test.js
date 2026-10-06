import { afterEach, describe, expect, it, vi } from 'vitest'
import records from '../src/data/catalog/records.json'
import { createGooglePlacesProvider, GOOGLE_FIELD_MASK, GOOGLE_TEXT_SEARCH_URL, normalizePlace } from './googlePlacesProvider.js'
import { CUISINE_LABELS, MAX_NEARBY_DISTANCE_MILES, nearbyDistanceBand, PAGE_SIZE, SEARCH_RADIUS_METERS, queriesForDish, haversineMiles, openingLabel } from '../shared/nearbyRestaurants.js'

const coordinates = { latitude: 40, longitude: -75 }
const dish = records.find(row => row.id === 'lort-cha')
const now = 1_790_000_000_000
const place = (id, changes = {}) => ({ id, displayName: { text: `Fixture restaurant ${id}` },
  formattedAddress: `Test address ${id}`, location: { latitude: 40.005, longitude: -75.005 },
  googleMapsUri: `https://maps.google.com/?cid=${id}`, rating: 4.6, userRatingCount: 269,
  currentOpeningHours: { openNow: true, weekdayDescriptions: ['Monday: 10 AM–10 PM'] }, ...changes })
const response = places => ({ ok: true, json: async () => ({ places }) })
const run = (fetchImpl, args = {}) => createGooglePlacesProvider({ fetchImpl, now: () => now }).search({ dish, coordinates, apiKey: 'test-key-not-real', ...args })
afterEach(() => vi.useRealTimers())

describe('canonical restaurant queries and local distance', () => {
  it('covers every canonical country explicitly', () => {
    expect(Object.keys(CUISINE_LABELS).sort()).toEqual([...new Set(records.map(row => row.countryCode))].sort())
    for (const row of records) expect(queriesForDish(row).primary).toContain(row.name)
  })
  it.each([
    ['lort-cha', 'Lort Cha Cambodian restaurant', 'Cambodian restaurant'],
    ['pancit-canton', 'Pancit Canton Filipino restaurant', 'Filipino restaurant'],
    ['ceviche', 'Ceviche Peruvian restaurant', 'Peruvian restaurant'],
    ['ramen', 'Ramen Japanese restaurant', 'Japanese restaurant'],
    ['jollof-rice', 'Jollof Rice Senegalese restaurant', 'Senegalese restaurant'],
    ['carbonara', 'Spaghetti Carbonara Italian restaurant', 'Italian restaurant'],
  ])('uses the actual canonical cuisine for %s', (id, primary, fallback) => {
    expect(queriesForDish(records.find(row => row.id === id))).toMatchObject({ primary, fallback })
  })
  it.each([['TR', 'Turkish'], ['CI', 'Ivorian'], ['MM', 'Burmese'], ['KR', 'Korean'], ['PS', 'Palestinian'], ['PR', 'Puerto Rican'], ['LK', 'Sri Lankan']])('maps %s without invented suffixes', (code, expected) => expect(CUISINE_LABELS[code]).toBe(expected))
  it('calculates a known distance and handles identical/antipodal/dateline coordinates', () => {
    expect(haversineMiles({ latitude: 40.7128, longitude: -74.006 }, { latitude: 34.0522, longitude: -118.2437 })).toBeCloseTo(2445.56, 1)
    expect(haversineMiles(coordinates, coordinates)).toBe(0)
    expect(haversineMiles({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(12436.82, 1)
    expect(haversineMiles({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 })).toBeLessThan(14)
    expect(haversineMiles({ latitude: 91, longitude: 0 }, coordinates)).toBeNull()
  })
})

describe('Google Text Search contract', () => {
  it('counts unique name/address venues before fallback and retains richer aliases without menu claims', async () => {
    const sameVenue = { displayName: { text: 'Café Nom' }, formattedAddress: '10 Main St., Boston' }
    const primary = Array.from({ length: 8 }, (_, index) => place(`primary-${index}`, sameVenue))
    const fallback = place('alias', { ...sameVenue, displayName: { text: ' CAFE NOM ' }, formattedAddress: '10 Main St Boston',
      photos: [{ name: 'places/alias/photos/image', authorAttributions: [], googleMapsUri: 'https://www.google.com/maps/photos/?id=image' }] })
    const fetch = vi.fn().mockResolvedValueOnce(response(primary)).mockResolvedValueOnce(response([fallback, place('other')]))
    const result = await run(fetch)
    expect(fetch).toHaveBeenCalledTimes(2); expect(result.restaurants).toHaveLength(2)
    expect(result.restaurants[0]).toMatchObject({ placeId: 'alias', matchType: 'exact-dish-search', matchEvidence: 'exact-search-match',
      photo: { name: 'places/alias/photos/image' } })
    expect(result.apiCalls).toBe(2)
  })
  it.each(['exact-dish-search', 'cuisine-fallback'])('ignores purported menu confirmation in raw %s results', matchType => {
    const result = normalizePlace(place('unconfirmed', { matchEvidence: 'confirmed-menu-item', confirmed: true }),
      { dishId: dish.id, cuisine: 'Cambodian', matchType, coordinates, observedAt: now })
    expect(result.matchEvidence).toBe(matchType === 'exact-dish-search' ? 'exact-search-match' : 'cuisine-fallback')
    expect(result).not.toHaveProperty('confirmed')
  })
  it('uses eight as the fallback threshold, caps merged results at ten, and preserves relevance', async () => {
    for (const size of [3, 7, 8, 10]) {
      const primary = Array.from({ length: size }, (_, i) => place(`primary-${i}`))
      const fetch = vi.fn().mockResolvedValueOnce(response(primary)).mockResolvedValueOnce(response([
        primary[0], ...Array.from({ length: 10 }, (_, i) => place(`fallback-${i}`)),
      ]))
      const result = await run(fetch)
      expect(fetch).toHaveBeenCalledTimes(size < 8 ? 2 : 1)
      expect(result.restaurants).toHaveLength(size < 8 ? 10 : size)
      expect(result.restaurants.slice(0, size).map(row => row.placeId)).toEqual(primary.map(row => row.id))
      expect(new Set(result.restaurants.map(row => row.placeId)).size).toBe(result.restaurants.length)
    }
  })
  it('selects the first usable photo and rejects unsafe resources or attribution', async () => {
    const photo = { name: 'places/a/photos/first', authorAttributions: [{ displayName: 'Photo author', uri: 'https://maps.google.com/maps/contrib/123' }], googleMapsUri: 'https://www.google.com/maps/place/?photo=first' }
    const normalize = photos => normalizePlace(place('a', { photos }), { dishId: dish.id, cuisine: 'Cambodian', matchType: 'exact-dish-search', coordinates, observedAt: now })
    expect(normalize([photo, { ...photo, name: 'places/a/photos/second' }]).photo.name).toBe('places/a/photos/first')
    expect(normalize([{ ...photo, name: 'places/other/photos/first' }]).photo).toBeNull()
    expect(normalize([{ ...photo, authorAttributions: [{ displayName: 'Author', uri: 'javascript:alert(1)' }] }]).photo).toBeNull()
    expect(normalize([{ ...photo, googleMapsUri: undefined }]).photo).toBeNull()
    expect(normalize([{ ...photo, googleMapsUri: undefined }, { ...photo, name: 'places/a/photos/second' }]).photo.name).toBe('places/a/photos/second')
  })
  it('requests only the required fields plus mandatory provider attribution', async () => {
    const fetch = vi.fn().mockResolvedValue(response(Array.from({ length: 10 }, (_, i) => place(`place-${i}`))))
    const result = await run(fetch)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe(GOOGLE_TEXT_SEARCH_URL)
    expect(request.headers['X-Goog-FieldMask'].split(',')).toEqual(['places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.googleMapsUri', 'places.rating', 'places.userRatingCount', 'places.currentOpeningHours', 'places.attributions', 'places.photos'])
    expect(GOOGLE_FIELD_MASK).not.toMatch(/\*|reviews|reviewSummary|priceLevel|routing|atmosphere|delivery|reservable/i)
    expect(JSON.parse(request.body)).toEqual({ textQuery: 'Lort Cha Cambodian restaurant', includedType: 'restaurant', strictTypeFiltering: true,
      pageSize: PAGE_SIZE, languageCode: 'en', includePureServiceAreaBusinesses: false,
      locationBias: { circle: { center: coordinates, radius: SEARCH_RADIUS_METERS } } })
    expect(result).toMatchObject({ apiCalls: 1, source: 'google-places' })
    expect(result.restaurants).toHaveLength(10)
  })
  it('waits for the primary, falls back once, and keeps exact provenance on duplicate Place IDs', async () => {
    let completePrimary
    const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { completePrimary = resolve }))
      .mockResolvedValueOnce(response([place('b'), place('c')]))
    const pending = run(fetch)
    expect(fetch).toHaveBeenCalledTimes(1)
    completePrimary(response([place('a'), place('b')]))
    const result = await pending
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetch.mock.calls[1][1].body).textQuery).toBe('Cambodian restaurant')
    expect(result.restaurants.map(row => [row.placeId, row.matchType])).toEqual([
      ['a', 'exact-dish-search'], ['b', 'exact-dish-search'], ['c', 'cuisine-fallback'],
    ])
    expect(result.apiCalls).toBe(2)
  })
  it('counts useful unique places after excluding global matches', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([place('a'), place('a'), place('far', { location: { latitude: 0, longitude: 0 } }), place('bad', { googleMapsUri: 'javascript:alert(1)' })]))
      .mockResolvedValueOnce(response([place('b'), place('c')]))
    expect((await run(fetch)).restaurants.map(row => row.placeId)).toEqual(['a', 'b', 'c'])
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it.each([4, 50, 183, 249, 251, 9001])('applies the hard product cap to a %s-mile result', miles => {
    const target = miles < 300 ? { latitude: coordinates.latitude + miles / 3958.7613 * 180 / Math.PI, longitude: coordinates.longitude }
      : { latitude: -20, longitude: 110 }
    const result = normalizePlace(place('distance', { location: target }), { dishId: dish.id, cuisine: 'Cambodian', matchType: 'exact-dish-search', coordinates, observedAt: now })
    expect(!!result).toBe(miles <= MAX_NEARBY_DISTANCE_MILES)
    if (result) expect(result.approximateDistanceMiles).toBeCloseTo(miles, 6)
  })
  it('labels the nearby, extended and farther bands at their boundaries', () => {
    expect([0, 50, 50.01, 150, 150.01, 250, 250.01].map(nearbyDistanceBand)).toEqual(['Nearby', 'Nearby', 'Extended area', 'Extended area', 'Farther away', 'Farther away', null])
  })
  it('counts post-distance primary results for fallback and sorts the merge before limiting', async () => {
    const at = (id, miles) => place(id, { location: { latitude: coordinates.latitude + miles / 3958.7613 * 180 / Math.PI, longitude: coordinates.longitude } })
    const primary = [at('farther', 183), at('near', 4), at('extended', 70), ...Array.from({ length: 7 }, (_, i) => place(`global-${i}`, { location: { latitude: 0, longitude: 100 } }))]
    const fetch = vi.fn().mockResolvedValueOnce(response(primary)).mockResolvedValueOnce(response([
      at('near', 4), at('local-cuisine', 8), ...Array.from({ length: 7 }, (_, i) => at(`local-${i}`, 10 + i)), at('global-fallback', 400),
    ]))
    const result = await run(fetch)
    expect(fetch).toHaveBeenCalledTimes(2); expect(result.apiCalls).toBe(2)
    expect(result.restaurants).toHaveLength(10)
    expect(result.restaurants.slice(0, 2).map(row => row.placeId)).toEqual(['near', 'local-cuisine'])
    expect(result.restaurants[0].matchType).toBe('exact-dish-search')
    expect(result.restaurants[1].matchType).toBe('cuisine-fallback')
    expect(result.restaurants.some(row => row.placeId.startsWith('global'))).toBe(false)
    expect(result.restaurants.map(row => row.approximateDistanceMiles)).toEqual([...result.restaurants.map(row => row.approximateDistanceMiles)].sort((a, b) => a - b))
  })
  it('stops after two calls even if every result is removed by the cap', async () => {
    const fetch = vi.fn().mockResolvedValue(response(Array.from({ length: 10 }, (_, i) => place(`global-${i}`, { location: { latitude: 0, longitude: 100 } }))))
    expect(await run(fetch)).toMatchObject({ restaurants: [], apiCalls: 2 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('handles zero results with exactly two requests and no pagination', async () => {
    const fetch = vi.fn().mockResolvedValue(response([]))
    expect(await run(fetch)).toMatchObject({ restaurants: [], apiCalls: 2 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it.each([400, 401, 403, 429, 500, 503])('does not retry or fall back after primary HTTP %s', async status => {
    const readBody = vi.fn(), fetch = vi.fn().mockResolvedValue({ ok: false, status, json: readBody })
    await expect(run(fetch)).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(readBody).not.toHaveBeenCalled()
  })
  it('returns usable primary matches if the fallback hits quota, with no third request', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([place('a')])).mockResolvedValueOnce({ ok: false, status: 429 })
    expect(await run(fetch)).toMatchObject({ apiCalls: 2, partialError: 'QUOTA_LIMIT', restaurants: [expect.objectContaining({ placeId: 'a' })] })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('propagates fallback quota if there is nothing useful to show', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([])).mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(run(fetch)).rejects.toMatchObject({ code: 'QUOTA_LIMIT' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('handles networking failure without retries', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('upstream detail that must not be exposed'))
    await expect(run(fetch)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('times out and aborts upstream without retries', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockImplementation((_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))))
    const failure = expect(run(fetch)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(8000)
    await failure
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('does not make a call without a key', async () => {
    const fetch = vi.fn()
    await expect(run(fetch, { apiKey: '' })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('normalizes missing facts and preserves conservative, time-limited opening labels', () => {
    const normalize = p => normalizePlace(p, { dishId: dish.id, cuisine: 'Cambodian', matchType: 'exact-dish-search', coordinates, observedAt: now })
    const missing = normalize(place('missing', { rating: undefined, userRatingCount: undefined, currentOpeningHours: undefined }))
    expect(missing).toMatchObject({ rating: null, userRatingCount: null, openNow: null, closingTime: null, openingHours: [] })
    expect(openingLabel(missing, now)).toBeNull()
    const open = normalize(place('open'))
    expect(openingLabel(open, now)).toBe('Open now')
    expect(openingLabel(open, now + 5 * 60 * 1000)).toBe('Hours at last search: open')
    expect(openingLabel(normalize(place('closed', { currentOpeningHours: { openNow: false } })), now)).toBe('Closed')
    expect(normalize(place('links', { attributions: [{ provider: 'Data provider', providerUri: 'javascript:alert(1)' }] })).attributions).toEqual([{ provider: 'Data provider', providerUri: null }])
  })
})


describe('opt-in raw search diagnostics (synthetic fixtures, not live Google evidence)', () => {
  it('traces raw primary/fallback, distance exclusions and aliases without altering requests or results', async () => {
    const near = place('thmor-fixture', { displayName: { text: 'THMOR DA fixture' }, photos: [] })
    const rawPrimary = [place('far-fixture', { displayName: { text: 'Far fixture' }, location: { latitude: 0, longitude: 0 } }), place('other')]
    const rawFallback = [near, place('thmor-alias', { displayName: near.displayName, formattedAddress: near.formattedAddress }), place('invalid', { googleMapsUri: 'javascript:bad' })]
    const fetch = vi.fn().mockResolvedValueOnce(response(rawPrimary)).mockResolvedValueOnce(response(rawFallback))
    const events = [], result = await run(fetch, { onDiagnostic: event => events.push(event) })
    const responses = events.filter(event => event.stage === 'query-response')
    expect(responses.map(event => event.textQuery)).toEqual(['Lort Cha Cambodian restaurant', 'Cambodian restaurant'])
    expect(responses[0].rawPlaces).toEqual(rawPrimary); expect(responses[1].rawPlaces).toEqual(rawFallback)
    expect(responses[0].normalized[0].reason).toBe('distance-cap')
    expect(responses[1].normalized.find(row => row.placeId === 'thmor-fixture').reason).toBe('accepted')
    expect(responses[1].normalized.find(row => row.placeId === 'invalid').reason).toBe('invalid-maps-uri')
    expect(responses[1].deduped[0].aliasIds).toEqual(['google:thmor-fixture', 'google:thmor-alias'])
    expect(result.restaurants.map(row => row.id)).toContain('google:thmor-fixture')
    expect(events.at(-1).candidates.map(row => row.id)).toEqual(result.restaurants.map(row => row.id))
    expect(events[0].nearbyFallback).toBe('not implemented'); expect(fetch).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(events)).not.toContain('test-key-not-real')
  })
  it('reports places removed by the ten-result cap and skips fallback when primary is sufficient', async () => {
    const raw = Array.from({ length: 10 }, (_, index) => place(`a-${index}`))
    const fetch = vi.fn().mockResolvedValue(response(raw)), events = []
    await run(fetch, { onDiagnostic: event => events.push(event) })
    expect(events.find(event => event.stage === 'fallback-decision').used).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    const primary = raw.slice(0, 7), fallback = Array.from({ length: 10 }, (_, index) => place(`b-${index}`))
    fetch.mockReset().mockResolvedValueOnce(response(primary)).mockResolvedValueOnce(response(fallback)); events.length = 0
    const result = await run(fetch, { onDiagnostic: event => events.push(event) })
    expect(result.restaurants).toHaveLength(10)
    expect(events.at(-1).candidates.filter(row => row.disposition === 'result-limit')).toHaveLength(7)
  })
  it('keeps the original production result when a diagnostic observer throws', async () => {
    const fetch = vi.fn().mockResolvedValue(response(Array.from({ length: 10 }, (_, index) => place(`a-${index}`))))
    const result = await run(fetch, { onDiagnostic: () => { throw new Error('Broken debug observer') } })
    expect(result.restaurants).toHaveLength(10); expect(result).not.toHaveProperty('searchDebug')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
