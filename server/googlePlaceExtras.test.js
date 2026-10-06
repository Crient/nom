import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { createGooglePlaceExtrasProvider, GOOGLE_DETAILS_FIELD_MASK, normalizeDetails, normalizeReview } from './googlePlaceExtrasProvider.js'
import { createPlaceExtrasHandler } from './placeExtrasHandler.js'

const review = index => ({ originalText: { text: `  Original review ${index}\n<literal text>  `, languageCode: 'fr' }, text: { text: 'Translated text', languageCode: 'en' }, rating: 4,
  relativePublishTimeDescription: 'a month ago', authorAttribution: { displayName: `Author ${index}`, uri: 'https://maps.google.com/maps/contrib/123' },
  googleMapsUri: `https://www.google.com/maps/reviews/?id=${index}`, visitDate: { year: 2026, month: 9 } })
const response = data => ({ ok: true, json: async () => data })
const options = { apiKey: 'test-server-key', onCall: vi.fn() }
function req(body, overrides = {}) {
  return { method: 'POST', body, headers: { origin: 'https://nom.example', host: 'nom.example', 'content-type': 'application/json', 'x-nom-nearby': '1' }, ...overrides }
}
function res() { return { headers: {}, setHeader(name, value) { this.headers[name] = value }, end(value) { this.body = JSON.parse(value) } } }
afterEach(() => vi.useRealTimers())

describe('on-demand Google extras provider', () => {
  it.each([
    [429, null, 'QUOTA_LIMIT', 429],
    [403, { status: 'RESOURCE_EXHAUSTED' }, 'QUOTA_LIMIT', 429],
    [403, { status: 'PERMISSION_DENIED', details: [{ reason: 'QUOTA_EXCEEDED' }] }, 'QUOTA_LIMIT', 429],
    [403, { status: 'PERMISSION_DENIED' }, 'PHOTO_ACCESS_DENIED', 503],
    [403, null, 'PHOTO_QUOTA_OR_ACCESS', 503],
    [403, { details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure' }] }, 'QUOTA_LIMIT', 429],
    [400, null, 'PHOTO_RESOURCE_INVALID', 400],
    [404, null, 'PHOTO_RESOURCE_UNAVAILABLE', 404],
    [500, null, 'PROVIDER_UNAVAILABLE', 503],
  ])('distinguishes photo HTTP %s (%j) as %s without retrying or leaking provider text', async (upstreamStatus, body, code, status) => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: upstreamStatus, json: async () => ({ error: { ...body, message: 'sensitive-provider-message test-server-key' } }) })
    const logger = { warn: vi.fn() }, response = res()
    await createPlaceExtrasHandler('photo', { provider: createGooglePlaceExtrasProvider({ fetchImpl: fetch }), getApiKey: () => 'test-server-key', logger })(req({ name: 'places/a/photos/b' }), response)
    expect(response.statusCode).toBe(status)
    expect(response.body).toMatchObject({ error: { code, source: 'google', upstreamStatus }, photoMediaCalls: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.stringify([response.body, logger.warn.mock.calls])).not.toMatch(/sensitive-provider-message|test-server-key|places\/a\/photos\/b/)
  })
  it('classifies an already-cancelled route request without spending an upstream call', async () => {
    const fetch = vi.fn(), onCall = vi.fn(), controller = new AbortController()
    controller.abort()
    await expect(createGooglePlaceExtrasProvider({ fetchImpl: fetch }).photo({ name: 'places/a/photos/b', apiKey: 'test-server-key', signal: controller.signal, onCall }))
      .rejects.toMatchObject({ code: 'CANCELLED', source: 'network', status: 499 })
    expect(fetch).not.toHaveBeenCalled(); expect(onCall).not.toHaveBeenCalled()
  })
  it('retrieves one photo via server header without returning or forwarding the key', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ photoUri: 'https://lh3.googleusercontent.com/p/photo' }))
    const result = await createGooglePlaceExtrasProvider({ fetchImpl: fetch }).photo({ name: 'places/place-1/photos/photo-1', ...options })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places/place-1/photos/photo-1/media?maxWidthPx=800&skipHttpRedirect=true')
    expect(url).not.toContain(options.apiKey)
    expect(request).toMatchObject({ method: 'GET', headers: { 'X-Goog-Api-Key': options.apiKey }, redirect: 'error' })
    expect(result).toEqual({ photoUri: 'https://lh3.googleusercontent.com/p/photo', photoMediaCalls: 1 })
  })
  it.each(['https://attacker.example/photo', 'javascript:alert(1)', 'https://lh3.googleusercontent.com/p?key=secret', 'https://lh3.googleusercontent.com/test-server-key'])('rejects unsafe/leaking image URI %s', async photoUri => {
    const fetch = vi.fn().mockResolvedValue(response({ photoUri }))
    await expect(createGooglePlaceExtrasProvider({ fetchImpl: fetch }).photo({ name: 'places/a/photos/b', ...options })).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('requests the explicit selected-detail fields once; caps and preserves review wording', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ id: 'selected', reviews: Array.from({ length: 5 }, (_, i) => review(i)), attributions: [{ provider: 'Provider', providerUri: 'https://example.com' }] }))
    const result = await createGooglePlaceExtrasProvider({ fetchImpl: fetch }).details({ placeId: 'selected', ...options })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]).toEqual(['https://places.googleapis.com/v1/places/selected?languageCode=en', expect.objectContaining({ headers: { 'X-Goog-Api-Key': options.apiKey, 'X-Goog-FieldMask': GOOGLE_DETAILS_FIELD_MASK } })])
    expect(GOOGLE_DETAILS_FIELD_MASK.split(',')).toEqual(['id', 'displayName', 'formattedAddress', 'rating', 'userRatingCount', 'currentOpeningHours', 'nationalPhoneNumber', 'websiteUri', 'googleMapsLinks', 'priceLevel', 'primaryTypeDisplayName', 'editorialSummary', 'reviews', 'attributions'])
    expect(GOOGLE_DETAILS_FIELD_MASK).not.toMatch(/\*|photos|reviewSummary|routing|generativeSummary/)
    expect(result.reviews).toHaveLength(3)
    expect(result.reviews[0]).toMatchObject({ text: review(0).originalText.text, author: { displayName: 'Author 0' }, visitDate: { year: 2026, month: 9 }, translated: false })
  })
  it('normalizes real detail actions and preserves editorial text without fabricating missing facts', () => {
    const details = normalizeDetails({ displayName: { text: 'Venue' }, formattedAddress: 'Actual address', nationalPhoneNumber: '(617) 555-1234', websiteUri: 'http://restaurant.example', googleMapsLinks: { directionsUri: 'https://www.google.com/maps/dir/?api=1&destination_place_id=a' },
      rating: 4.7, userRatingCount: 200, currentOpeningHours: { openNow: true, weekdayDescriptions: ['Monday: 9–5'] }, priceLevel: 'PRICE_LEVEL_MODERATE', primaryTypeDisplayName: { text: 'Restaurant' }, editorialSummary: { text: '  Original editorial summary.\n', languageCode: 'en' } }, 123)
    expect(details).toMatchObject({ name: 'Venue', nationalPhoneNumber: '(617) 555-1234', websiteUri: 'http://restaurant.example/', priceLevel: 'PRICE_LEVEL_MODERATE', observedAt: 123, editorialSummary: '  Original editorial summary.\n' })
    expect(normalizeDetails({}, 123)).toEqual({})
    expect(normalizeDetails({ websiteUri: 'javascript:alert(1)', nationalPhoneNumber: 'tel:javascript:alert(1)', googleMapsLinks: { directionsUri: 'https://attacker.example' }, priceLevel: 'cheap', rating: 99 }, 123)).toEqual({})
  })
  it('omits unattributable reviews and handles missing reviews without invented content', async () => {
    expect(normalizeReview({ ...review(0), authorAttribution: null })).toBeNull()
    expect(normalizeReview({ ...review(0), googleMapsUri: 'javascript:alert(1)' })).toBeNull()
    const fetch = vi.fn().mockResolvedValue(response({ id: 'selected' }))
    expect(await createGooglePlaceExtrasProvider({ fetchImpl: fetch }).details({ placeId: 'selected', ...options })).toMatchObject({ reviews: [], placeDetailsCalls: 1 })
  })
  it.each([400, 401, 403, 404, 429, 500])('does not retry after HTTP %s or read its error body', async status => {
    const json = vi.fn(), fetch = vi.fn().mockResolvedValue({ ok: false, status, json })
    await expect(createGooglePlaceExtrasProvider({ fetchImpl: fetch }).details({ placeId: 'a', ...options })).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(1); expect(json).not.toHaveBeenCalled()
  })
  it('times out without retrying', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))))
    const pending = expect(createGooglePlaceExtrasProvider({ fetchImpl: fetch }).photo({ name: 'places/a/photos/b', ...options })).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(8000); await pending
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe.each(['photo', 'details'])('secure %s endpoint', kind => {
  const body = kind === 'photo' ? { name: 'places/a/photos/b' } : { placeId: 'a' }
  const success = kind === 'photo' ? { photoUri: 'https://lh3.googleusercontent.com/p/photo', photoMediaCalls: 1 } : { placeId: 'a', reviews: [], placeDetailsCalls: 1 }
  const setup = () => {
    const provider = { [kind]: vi.fn().mockResolvedValue(success) }, logger = { warn: vi.fn() }
    return { provider, logger, endpoint: createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key', logger }) }
  }
  it('accepts only qualified same-origin input and returns no-store JSON', async () => {
    const { endpoint, provider } = setup(), response = res()
    await endpoint(req(body), response)
    expect(response.statusCode).toBe(200); expect(response.headers['Cache-Control']).toBe('private, no-store')
    expect(JSON.stringify(response.body)).not.toContain('test-server-key')
    expect(provider[kind]).toHaveBeenCalledTimes(1)
  })
  it.each([null, {}, { url: 'https://attacker.example' }, { placeId: '../etc' }, { name: 'places/a/photos/../other' }, { name: 'https://places.googleapis.com/anything' }])('rejects malformed/proxy input %j', async bad => {
    const { endpoint, provider } = setup(), response = res()
    await endpoint(req(bad), response)
    expect(response.statusCode).toBe(400); expect(provider[kind]).not.toHaveBeenCalled()
  })
  it('rejects extra keys, cross-origin, GET, non-JSON, and oversized input', async () => {
    const { endpoint, provider } = setup()
    for (const request of [req({ ...body, url: 'https://attacker.example' }), req(body, { method: 'GET' }),
      req(body, { headers: { host: 'nom.example', origin: 'https://attacker.example', 'x-nom-nearby': '1', 'content-type': 'application/json' } }),
      req(body, { headers: { host: 'nom.example', origin: 'https://nom.example', 'x-nom-nearby': '1', 'content-type': 'text/plain' } }), req({ name: 'x'.repeat(5000) })]) {
      const response = res(); await endpoint(request, response); expect(response.statusCode).toBeGreaterThanOrEqual(400)
    }
    expect(provider[kind]).not.toHaveBeenCalled()
  })
  it('handles missing keys without a provider request', async () => {
    const provider = { [kind]: vi.fn() }, response = res()
    await createPlaceExtrasHandler(kind, { provider, getApiKey: () => '', logger: { warn: vi.fn() } })(req(body), response)
    expect(response.body.error.code).toBe('NOT_CONFIGURED'); expect(provider[kind]).not.toHaveBeenCalled()
  })
  it('deduplicates concurrent consumers', async () => {
    let complete
    const provider = { [kind]: vi.fn(() => new Promise(resolve => { complete = resolve })) }
    const endpoint = createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key' })
    const a = res(), b = res(), calls = [endpoint(req(body), a), endpoint(req(body), b)]
    await Promise.resolve(); await Promise.resolve()
    expect(provider[kind]).toHaveBeenCalledTimes(1); complete(success); await Promise.all(calls)
    expect(a.body).toEqual(b.body)
  })
  it('cancels work when the last consumer leaves', async () => {
    let signal
    const provider = { [kind]: vi.fn(options => { signal = options.signal; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')))) }) }
    const response = Object.assign(new EventEmitter(), res())
    const pending = createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key', logger: { warn: vi.fn() } })(req(body), response)
    await Promise.resolve(); await Promise.resolve(); response.destroyed = true; response.emit('close'); await pending
    expect(signal.aborted).toBe(true); expect(response.body).toBeUndefined()
  })
  it('enforces its separate warm-instance daily/minute budget', async () => {
    let time = 1_790_000_000_000
    const provider = { [kind]: vi.fn(async options => { options.onCall(); return success }) }
    const endpoint = createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key', now: () => time, logger: { warn: vi.fn() } })
    const limit = kind === 'photo' ? 30 : 20
    for (let i = 0; i < limit; i++) { const response = res(); await endpoint(req(body), response); expect(response.statusCode).toBe(200); time += 60_001 }
    const response = res(); await endpoint(req(body), response); expect(response.statusCode).toBe(429)
    expect(response.body.error).toMatchObject({ code: 'QUOTA_LIMIT', source: 'nom-budget-day' })
    expect(response.body.error.upstreamStatus).toBeUndefined()
    expect(Number(response.headers['Retry-After'])).toBeGreaterThan(0)
  })
  it('enforces the minute budget and reports zero upstream calls for the blocked attempt', async () => {
    const provider = { [kind]: vi.fn(async options => { options.onCall(); return success }) }
    const endpoint = createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key', now: () => 1_790_000_000_000, logger: { warn: vi.fn() } })
    for (let i = 0; i < (kind === 'photo' ? 10 : 6); i++) { const response = res(); await endpoint(req(body), response); expect(response.statusCode).toBe(200) }
    const response = res(); await endpoint(req(body), response)
    expect(response.statusCode).toBe(429)
    expect(response.body[kind === 'photo' ? 'photoMediaCalls' : 'placeDetailsCalls']).toBe(0)
    expect(response.body.error).toMatchObject({ code: 'QUOTA_LIMIT', source: 'nom-budget-minute', retryAfterMs: 60_000 })
  })
  it('reports one upstream attempt on a sanitized provider failure', async () => {
    const provider = createGooglePlaceExtrasProvider({ fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 429 }) })
    const response = res()
    await createPlaceExtrasHandler(kind, { provider, getApiKey: () => 'test-server-key', logger: { warn: vi.fn() } })(req(body), response)
    expect(response.statusCode).toBe(429)
    expect(response.body[kind === 'photo' ? 'photoMediaCalls' : 'placeDetailsCalls']).toBe(1)
    expect(JSON.stringify(response.body)).not.toContain('test-server-key')
  })
})
