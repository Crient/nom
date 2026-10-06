import { describe, expect, it, vi } from 'vitest'
import { createNearbyRestaurantsHandler } from './nearbyRestaurantsHandler.js'
import { createGooglePlacesProvider, NearbySearchError } from './googlePlacesProvider.js'
import { EventEmitter } from 'node:events'

function request(body = { dishId: 'lort-cha', latitude: 40.123456, longitude: -75.234567 }, changes = {}) {
  return { method: 'POST', body, headers: { host: 'nom.example', origin: 'https://nom.example',
    'content-type': 'application/json', 'x-nom-nearby': '1', 'sec-fetch-site': 'same-origin' }, ...changes }
}
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value) } }
}
const result = { source: 'google-places', restaurants: [], apiCalls: 2, searchedAt: Date.now() }
const handler = provider => createNearbyRestaurantsHandler({ provider, getApiKey: () => 'test-key-not-real', logger: { warn: vi.fn() } })

describe('secure Nom server endpoint', () => {
  it('uses canonical data, rounds location, never returns a key, and disables HTTP caching', async () => {
    const provider = { search: vi.fn().mockResolvedValue(result) }, res = response()
    await handler(provider)(request(), res)
    expect(res.statusCode).toBe(200)
    expect(provider.search).toHaveBeenCalledWith(expect.objectContaining({
      dish: expect.objectContaining({ id: 'lort-cha', name: 'Lort Cha', countryCode: 'KH' }),
      coordinates: { latitude: 40.12, longitude: -75.23 },
    }))
    expect(res.headers['Cache-Control']).toBe('private, no-store')
    expect(JSON.stringify(res.body)).not.toContain('test-key-not-real')
  })
  it.each([
    { dishId: 'unknown', latitude: 40, longitude: -75 },
    { dishId: 'lort-cha', latitude: '40', longitude: -75 },
    { dishId: 'lort-cha', latitude: 91, longitude: -75 },
    { dishId: 'lort-cha', latitude: 40, longitude: -181 },
    { dishId: 'lort-cha', latitude: NaN, longitude: 0 },
    { dishId: 'lort-cha', latitude: 40, longitude: -75, textQuery: 'arbitrary relay' },
    { dishId: 'lort-cha', latitude: 40, longitude: -75, country: 'forged cuisine' },
    [], null, 'invalid JSON',
  ])('rejects malformed/counterfeit input without Google calls: %j', async body => {
    const provider = { search: vi.fn() }, res = response()
    await handler(provider)(request(body), res)
    expect(res.statusCode).toBe(400)
    expect(provider.search).not.toHaveBeenCalled()
  })
  it.each([
    { method: 'GET' },
    { headers: { host: 'nom.example', origin: 'https://attacker.example', 'content-type': 'application/json', 'x-nom-nearby': '1' } },
    { headers: { host: 'nom.example', origin: 'https://nom.example', 'content-type': 'text/plain', 'x-nom-nearby': '1' } },
    { headers: { host: 'nom.example', origin: 'https://nom.example', 'content-type': 'application/json' } },
    { headers: { host: 'nom.example', 'content-type': 'application/json', 'x-nom-nearby': '1' } },
  ])('rejects cross-site/unqualified requests: %j', async changes => {
    const provider = { search: vi.fn() }, res = response()
    await handler(provider)(request(undefined, changes), res)
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    expect(provider.search).not.toHaveBeenCalled()
  })
  it('rejects oversized bodies without calling the provider', async () => {
    const provider = { search: vi.fn() }, res = response()
    await handler(provider)(request({ dishId: 'lort-cha', textQuery: 'x'.repeat(2000) }), res)
    expect(res.statusCode).toBe(413)
    expect(provider.search).not.toHaveBeenCalled()
  })
  it('handles the absent key only when deliberately invoked', async () => {
    const provider = { search: vi.fn() }, res = response()
    await createNearbyRestaurantsHandler({ provider, getApiKey: () => undefined, logger: { warn: vi.fn() } })(request(), res)
    expect(res.body.error.code).toBe('NOT_CONFIGURED')
    expect(provider.search).not.toHaveBeenCalled()
  })
  it('deduplicates simultaneous same-dish/same-area calls across clients', async () => {
    let complete
    const provider = { search: vi.fn().mockImplementation(() => new Promise(resolve => { complete = resolve })) }
    const endpoint = handler(provider), a = response(), b = response()
    const pending = [endpoint(request(), a), endpoint(request({ dishId: 'lort-cha', latitude: 40.124, longitude: -75.234 }), b)]
    await Promise.resolve(); await Promise.resolve()
    expect(provider.search).toHaveBeenCalledTimes(1)
    complete(result); await Promise.all(pending)
    expect(a.body).toEqual(b.body)
  })
  it('exposes fixed diagnostics only, even when the upstream error contains secrets', async () => {
    const provider = { search: vi.fn().mockRejectedValue(new NearbySearchError('PROVIDER_CONFIGURATION')) }
    const logger = { warn: vi.fn() }, res = response()
    await createNearbyRestaurantsHandler({ provider, getApiKey: () => 'test-key-not-real', logger })(request(), res)
    expect(res.body).toEqual({ error: { code: 'PROVIDER_CONFIGURATION' } })
    expect(logger.warn).toHaveBeenCalledWith({ code: 'PROVIDER_CONFIGURATION', status: 503 })
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('test-key-not-real')
  })
  it('restrains the warm instance to six upstream calls per minute without a retry loop', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ places: [] }) })
    const endpoint = createNearbyRestaurantsHandler({ provider: createGooglePlacesProvider({ fetchImpl: fetch }),
      getApiKey: () => 'test-key-not-real', now: () => 1_790_000_000_000, logger: { warn: vi.fn() } })
    for (let index = 0; index < 4; index++) {
      const res = response(); await endpoint(request(), res)
      expect(res.statusCode).toBe(index < 3 ? 200 : 429)
    }
    expect(fetch).toHaveBeenCalledTimes(6)
  })
  it('restrains the warm instance to 30 daily calls and resets its budget on a new day', async () => {
    let time = 1_790_000_000_000
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ places: [] }) })
    const endpoint = createNearbyRestaurantsHandler({ provider: createGooglePlacesProvider({ fetchImpl: fetch }),
      getApiKey: () => 'test-key-not-real', now: () => time, logger: { warn: vi.fn() } })
    for (let index = 0; index < 15; index++) {
      const res = response(); await endpoint(request(), res); expect(res.statusCode).toBe(200); time += 60_000
    }
    const exhausted = response(); await endpoint(request(), exhausted)
    expect(exhausted.statusCode).toBe(429); expect(fetch).toHaveBeenCalledTimes(30)
    time += 86_400_000
    const reset = response(); await endpoint(request(), reset)
    expect(reset.statusCode).toBe(200); expect(fetch).toHaveBeenCalledTimes(32)
  })
  it('aborts upstream when its only HTTP consumer disconnects', async () => {
    let upstreamSignal
    const provider = { search: vi.fn(({ signal }) => {
      upstreamSignal = signal
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new NearbySearchError('CANCELLED', 499))))
    }) }
    const res = Object.assign(new EventEmitter(), response()), pending = handler(provider)(request(), res)
    await Promise.resolve(); await Promise.resolve()
    res.destroyed = true; res.emit('close'); await pending
    expect(upstreamSignal.aborted).toBe(true); expect(res.body).toBeUndefined()
  })
  it('keeps a shared server request alive while another HTTP consumer remains', async () => {
    let complete, upstreamSignal
    const provider = { search: vi.fn(({ signal }) => {
      upstreamSignal = signal; return new Promise(resolve => { complete = resolve })
    }) }
    const endpoint = handler(provider), a = Object.assign(new EventEmitter(), response()), b = response()
    const calls = [endpoint(request(), a), endpoint(request(), b)]
    await Promise.resolve(); await Promise.resolve()
    a.destroyed = true; a.emit('close'); expect(upstreamSignal.aborted).toBe(false)
    complete(result); await Promise.all(calls)
    expect(b.statusCode).toBe(200); expect(provider.search).toHaveBeenCalledTimes(1)
  })
  it('cancels upstream work on a native Node request error and releases listeners', async () => {
    let upstreamSignal
    const provider = { search: vi.fn(({ signal }) => {
      upstreamSignal = signal
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new NearbySearchError('CANCELLED', 499))))
    }) }
    const req = Object.assign(new EventEmitter(), request()), res = response()
    const pending = handler(provider)(req, res)
    await Promise.resolve(); await Promise.resolve()
    req.emit('error', new Error('connection closed')); await pending
    expect(upstreamSignal.aborted).toBe(true)
    expect(req.listenerCount('error')).toBe(0)
  })
})


describe('local-only diagnostic transport', () => {
  it.each([false, true])('includes raw debug events only when the server explicitly enables debug=%s', async debug => {
    const provider = { search: vi.fn(async ({ onDiagnostic }) => {
      onDiagnostic?.({ stage: 'query-sent', textQuery: 'Lort Cha Cambodian restaurant' })
      return result
    }) }, res = response()
    await createNearbyRestaurantsHandler({ provider, debug, getApiKey: () => 'test-key-not-real' })(request(), res)
    expect(res.statusCode).toBe(200)
    if (debug) expect(res.body.searchDebug.events).toEqual([{ stage: 'query-sent', textQuery: 'Lort Cha Cambodian restaurant' }])
    else expect(res.body).not.toHaveProperty('searchDebug')
    expect(JSON.stringify(res.body)).not.toContain('test-key-not-real')
    expect(provider.search).toHaveBeenCalledTimes(1)
  })
})
