import { readFileSync } from 'node:fs'
import { createGooglePlacesProvider, NearbySearchError } from './googlePlacesProvider.js'
import { approximateArea, searchKey, validCoordinates } from '../shared/nearbyRestaurants.js'

const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog/records.json', import.meta.url), 'utf8'))
const canonical = new Map(catalog.map(dish => [dish.id, dish]))
const MAX_BODY_BYTES = 1024

export async function readBody(req, limit = MAX_BODY_BYTES) {
  if (Number(req.headers['content-length']) > limit) throw new NearbySearchError('INVALID_REQUEST', 413)
  if (req.body !== undefined) {
    const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(serialized) > limit) throw new NearbySearchError('INVALID_REQUEST', 413)
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  }
  let bytes = 0, body = ''
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk)
    if (bytes > limit) throw new NearbySearchError('INVALID_REQUEST', 413)
    body += chunk
  }
  return JSON.parse(body)
}

export function validateSearchInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some(key => !['dishId', 'latitude', 'longitude'].includes(key))
      || typeof body.dishId !== 'string' || body.dishId.length > 100 || !canonical.has(body.dishId)
      || !validCoordinates(body)) throw new NearbySearchError('INVALID_REQUEST', 400)
  return { dish: canonical.get(body.dishId), coordinates: approximateArea(body) }
}

export function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin)
    return ['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host
      && !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])
      && req.headers['x-nom-nearby'] === '1'
  } catch { return false }
}

/** Native Vercel Node handler, also mounted by Vite for local development. */
export function createNearbyRestaurantsHandler({ provider = createGooglePlacesProvider(),
  getApiKey = () => process.env.GOOGLE_PLACES_API_KEY, now = Date.now, debug = false,
  logger = { warn: data => console.warn('[Nom nearby]', data) },
} = {}) {
  const inFlight = new Map()
  let windowStarted = 0, minuteCalls = 0, day = '', dayCalls = 0
  // Defense in depth per warm instance. Google's project-wide 30/day and 6/minute quotas remain authoritative.
  const budget = () => {
    const time = now(), currentDay = new Date(time).toISOString().slice(0, 10)
    if (currentDay !== day) { day = currentDay; dayCalls = 0 }
    if (time - windowStarted >= 60_000) { windowStarted = time; minuteCalls = 0 }
    if (minuteCalls >= 6 || dayCalls >= 30) throw new NearbySearchError('QUOTA_LIMIT', 429)
    minuteCalls += 1; dayCalls += 1
  }
  return async function nearbyRestaurants(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, data) => { if (!res.destroyed) { res.statusCode = status; res.end(JSON.stringify(data)) } }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: { code: 'METHOD_NOT_ALLOWED' } }) }
    if (!sameOrigin(req)) return send(403, { error: { code: 'FORBIDDEN' } })
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) return send(415, { error: { code: 'INVALID_REQUEST' } })
    try {
      const { dish, coordinates } = validateSearchInput(await readBody(req))
      const apiKey = getApiKey()
      if (!apiKey || apiKey === 'your_google_places_api_key') throw new NearbySearchError('NOT_CONFIGURED')
      const key = searchKey(dish.id, coordinates)
      if (!inFlight.has(key)) {
        const job = { controller: new AbortController(), consumers: 0, settled: false }
        const events = debug ? [] : null
        job.promise = provider.search({ dish, coordinates, apiKey, signal: job.controller.signal, onCall: budget,
          ...(events ? { onDiagnostic: event => events.push(event) } : {}) })
          .then(result => events ? { ...result, searchDebug: { events } } : result)
        inFlight.set(key, job)
        job.promise.finally(() => {
          job.settled = true
          if (inFlight.get(key) === job) inFlight.delete(key)
        }).catch(() => {})
      }
      const job = inFlight.get(key)
      job.consumers += 1
      let released = false
      const release = () => {
        if (released) return
        released = true; job.consumers -= 1
        if (!job.consumers && !job.settled) job.controller.abort()
      }
      const disconnected = () => { if (!res.writableEnded) release() }
      res.once?.('close', disconnected)
      req.once?.('error', release)
      try { return send(200, await job.promise) }
      finally { res.off?.('close', disconnected); req.off?.('error', release); release() }
    } catch (error) {
      const failure = error instanceof NearbySearchError ? error : error instanceof SyntaxError
        ? new NearbySearchError('INVALID_REQUEST', 400) : new NearbySearchError('PROVIDER_UNAVAILABLE')
      // Fixed codes only; no request body, key, upstream payload, precise location or raw error text.
      logger.warn({ code: failure.code, status: failure.status })
      return send(failure.status, { error: { code: failure.code } })
    }
  }
}
