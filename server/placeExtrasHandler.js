import { readBody, sameOrigin } from './nearbyRestaurantsHandler.js'
import { NearbySearchError } from './googlePlacesProvider.js'
import { createGooglePlaceExtrasProvider } from './googlePlaceExtrasProvider.js'
import { validPhotoName, validPlaceId } from '../shared/placeMedia.js'
import { placeExtraErrorInfo } from '../shared/placeExtrasErrors.js'

export function createPlaceExtrasHandler(kind, { provider = createGooglePlaceExtrasProvider(),
  getApiKey = () => process.env.GOOGLE_PLACES_API_KEY, now = Date.now,
  logger = { warn: data => console.warn('[Nom place]', data) } } = {}) {
  if (!['photo', 'details'].includes(kind)) throw new Error('Invalid endpoint kind')
  const field = kind === 'photo' ? 'name' : 'placeId', validate = kind === 'photo' ? validPhotoName : validPlaceId
  const counter = kind === 'photo' ? 'photoMediaCalls' : 'placeDetailsCalls'
  const inFlight = new Map()
  let windowStarted = 0, minute = 0, day = '', daily = 0
  const budget = () => {
    const time = now(), currentDay = new Date(time).toISOString().slice(0, 10)
    if (day !== currentDay) { day = currentDay; daily = 0 }
    if (time - windowStarted >= 60_000) { windowStarted = time; minute = 0 }
    const dailyBlocked = daily >= (kind === 'photo' ? 30 : 20)
    if (dailyBlocked || minute >= (kind === 'photo' ? 10 : 6)) throw Object.assign(new NearbySearchError('QUOTA_LIMIT', 429), {
      source: dailyBlocked ? 'nom-budget-day' : 'nom-budget-minute',
      retryAfterMs: dailyBlocked ? Date.parse(`${currentDay}T00:00:00Z`) + 86_400_000 - time : windowStarted + 60_000 - time,
    })
    daily++; minute++
  }
  return async (req, res) => {
    let requestJob
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body) => { if (!res.destroyed) { res.statusCode = status; res.end(JSON.stringify(body)) } }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: { code: 'METHOD_NOT_ALLOWED' } }) }
    if (!sameOrigin(req)) return send(403, { error: { code: 'FORBIDDEN' } })
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) return send(415, { error: { code: 'INVALID_REQUEST' } })
    try {
      const body = await readBody(req, kind === 'photo' ? 4096 : 1024)
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !validate(body[field])) throw new NearbySearchError('INVALID_REQUEST', 400)
      const apiKey = getApiKey()
      if (!apiKey || apiKey === 'your_google_places_api_key') throw new NearbySearchError('NOT_CONFIGURED')
      const key = body[field]
      if (!inFlight.has(key)) {
        const job = { controller: new AbortController(), consumers: 0, settled: false, calls: 0 }
        job.promise = provider[kind]({ ...body, apiKey, onCall: () => { budget(); job.calls++ }, signal: job.controller.signal })
        inFlight.set(key, job)
        job.promise.finally(() => { job.settled = true; if (inFlight.get(key) === job) inFlight.delete(key) }).catch(() => {})
      }
      const job = inFlight.get(key); requestJob = job; job.consumers++
      let released = false
      const release = () => { if (!released) { released = true; job.consumers--; if (!job.consumers && !job.settled) job.controller.abort() } }
      const close = () => { if (!res.writableEnded) release() }
      res.once?.('close', close); req.once?.('error', release)
      try { send(200, await job.promise) }
      finally { res.off?.('close', close); req.off?.('error', release); release() }
    } catch (error) {
      const failure = error instanceof NearbySearchError ? error : new NearbySearchError(error instanceof SyntaxError ? 'INVALID_REQUEST' : 'PROVIDER_UNAVAILABLE', error instanceof SyntaxError ? 400 : 503)
      const info = placeExtraErrorInfo(failure)
      logger.warn({ kind, ...info, status: failure.status, calls: requestJob?.calls ?? 0 })
      if (info.retryAfterMs) res.setHeader('Retry-After', String(Math.ceil(info.retryAfterMs / 1000)))
      send(failure.status, { error: info, [counter]: requestJob?.calls ?? 0 })
    }
  }
}
