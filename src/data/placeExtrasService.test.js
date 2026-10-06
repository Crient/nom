import { describe, expect, it, vi } from 'vitest'
import { createPlaceExtrasService } from './placeExtrasService'
import { MEDIA_SESSION_TTL_MS } from '../../shared/placeMedia.js'

describe.each(['photo', 'details'])('ephemeral %s service', kind => {
  const now = 1_790_000_000_000
  const value = kind === 'photo' ? { name: 'places/a/photos/b', observedAt: now } : 'a'
  const key = kind === 'photo' ? value.name : value
  const result = kind === 'photo' ? { photoUri: 'https://lh3.googleusercontent.com/photo', photoMediaCalls: 1 } : { placeId: 'a', reviews: [], placeDetailsCalls: 1 }
  const response = { ok: true, json: async () => result }
  it('reads/subscribes without fetching and requests only after explicit load', async () => {
    const fetch = vi.fn().mockResolvedValue(response), diagnostic = vi.fn()
    const service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now, diagnostic })
    const callback = vi.fn(), leave = service.subscribe(key, callback)
    expect(service.getSnapshot(key).status).toBe('idle'); expect(fetch).not.toHaveBeenCalled()
    await service.load(value)
    expect(fetch).toHaveBeenCalledTimes(1); expect(callback).toHaveBeenCalled()
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'X-Nom-Nearby': '1' } })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(kind === 'photo' ? { name: value.name } : { placeId: value })
    await service.load(value); expect(fetch).toHaveBeenCalledTimes(1)
    expect(diagnostic.mock.calls.map(row => row[1])).toEqual([1, 0]); leave()
  })
  it('deduplicates concurrent consumers and never writes browser storage', async () => {
    let complete
    const fetch = vi.fn(() => new Promise(resolve => { complete = resolve })), service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now })
    const a = service.load(value), b = service.load(value)
    expect(a).toBe(b); expect(fetch).toHaveBeenCalledTimes(1)
    complete(response); expect(await a).toEqual(result)
    expect(service.getSnapshot(key).data).toEqual(result)
  })
  it('caches failures without automatic retries', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { code: 'QUOTA_LIMIT' } }) })
    const service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now })
    await service.load(value); await service.load(value)
    expect(fetch).toHaveBeenCalledTimes(1); expect(service.getSnapshot(key)).toMatchObject({ status: 'error', errorCode: 'QUOTA_LIMIT' })
  })
  it('keeps an in-flight photo/details request alive as preview subscribers leave and list subscribers arrive', async () => {
    let complete
    const fetch = vi.fn(() => new Promise(resolve => { complete = resolve }))
    const service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now })
    const leave = service.subscribe(key, vi.fn()), pending = service.load(value)
    leave()
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(false)
    const update = vi.fn(); service.subscribe(key, update)
    expect(service.load(value)).toBe(pending)
    complete(response); await pending
    expect(fetch).toHaveBeenCalledTimes(1); expect(update).toHaveBeenCalledTimes(1)
    expect(service.getSnapshot(key).status).toBe('ready')
  })
  it('honors the local quota cooldown on deliberate retry and preserves safe source/status diagnostics', async () => {
    let time = now
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { code: 'QUOTA_LIMIT', source: 'nom-budget-minute', retryAfterMs: 60_000, message: 'private' }, [kind === 'photo' ? 'photoMediaCalls' : 'placeDetailsCalls']: 0 }) }).mockResolvedValue(response)
    const errorDiagnostic = vi.fn(), service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => time, errorDiagnostic })
    await service.load(value); await service.load(value, { retry: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(errorDiagnostic).toHaveBeenCalledWith({ kind, code: 'QUOTA_LIMIT', source: 'nom-budget-minute', retryAfterMs: 60_000, httpStatus: 429, calls: 0 })
    time += 60_000; await service.load(value) // navigation is never an automatic retry
    expect(fetch).toHaveBeenCalledTimes(1)
    await service.load(value, { retry: true }); expect(fetch).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot(key).status).toBe('ready')
  })
  it.each(['AbortError', 'TypeError'])('distinguishes a %s from provider errors', async name => {
    const errorDiagnostic = vi.fn(), fetch = vi.fn().mockRejectedValue(Object.assign(new Error('private transport message'), { name }))
    const service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now, errorDiagnostic })
    await service.load(value)
    expect(errorDiagnostic).toHaveBeenCalledWith({ kind, code: name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR', source: 'network' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('expires session results and clears without touching stored Place IDs', async () => {
    let time = now
    const fetch = vi.fn().mockResolvedValue(response), service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => time })
    await service.load(value); time += MEDIA_SESSION_TTL_MS
    expect(service.getSnapshot(key).status).toBe('idle')
    await service.load(kind === 'photo' ? { ...value, observedAt: time } : value)
    expect(fetch).toHaveBeenCalledTimes(2)
    service.clear(); expect(service.getSnapshot(key).status).toBe('idle')
  })
  it('does not relay arbitrary resource names or URLs', async () => {
    const fetch = vi.fn(), service = createPlaceExtrasService(kind, { fetchImpl: fetch })
    await service.load(kind === 'photo' ? { name: 'https://attacker.example' } : '../etc')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects malformed responses instead of displaying them', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photoUri: 'javascript:alert(1)', reviews: Array(4).fill({}), placeId: 'different', photoMediaCalls: 1, placeDetailsCalls: 1 }) })
    const service = createPlaceExtrasService(kind, { fetchImpl: fetch, now: () => now })
    await service.load(value); expect(service.getSnapshot(key).status).toBe('error')
  })
})
describe('photo lifetime', () => {
  it('shares a confirmed quota pause across newly visible photos without hiding cached successes or spending requests', async () => {
    const now = 1_790_000_000_000, success = { photoUri: 'https://lh3.googleusercontent.com/one', photoMediaCalls: 1 }
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => success })
      .mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { code: 'QUOTA_LIMIT', source: 'google', upstreamStatus: 429, retryAfterMs: 60_000 }, photoMediaCalls: 1 }) })
    const service = createPlaceExtrasService('photo', { fetchImpl: fetch, now: () => now })
    const value = name => ({ name: `places/a/photos/${name}`, observedAt: now })
    await service.load(value('ready')); await service.load(value('quota')); await service.load(value('unseen'))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot(value('unseen').name)).toMatchObject({ status: 'error', errorCode: 'QUOTA_LIMIT', errorInfo: { source: 'google', upstreamStatus: 429 } })
    expect(await service.load(value('ready'))).toEqual(success)
    await service.load(value('unseen'), { retry: true }); expect(fetch).toHaveBeenCalledTimes(2)
    service.clear(); await service.load(value('unseen')); expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('recovers a stale resource after a fresh search observes the same name without retrying old observations', async () => {
    const now = 1_790_000_000_000, value = { name: 'places/a/photos/b', observedAt: now - MEDIA_SESSION_TTL_MS }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photoUri: 'https://lh3.googleusercontent.com/new', photoMediaCalls: 1 }) })
    const service = createPlaceExtrasService('photo', { fetchImpl: fetch, now: () => now })
    await service.load(value); await service.load(value)
    expect(fetch).not.toHaveBeenCalled(); expect(service.getSnapshot(value.name).errorCode).toBe('PHOTO_STALE')
    await service.load({ ...value, observedAt: now }); await service.load({ ...value, observedAt: now })
    expect(fetch).toHaveBeenCalledTimes(1); expect(service.getSnapshot(value.name).status).toBe('ready')
  })
  it('refuses old photo names without another API request or search', async () => {
    const fetch = vi.fn(), service = createPlaceExtrasService('photo', { fetchImpl: fetch, now: () => 1_790_000_000_000 })
    await service.load({ name: 'places/a/photos/b', observedAt: 1_790_000_000_000 - MEDIA_SESSION_TTL_MS })
    expect(fetch).not.toHaveBeenCalled()
    expect(service.getSnapshot('places/a/photos/b').errorCode).toBe('PHOTO_STALE')
  })
})
