import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'

/** Preserve the existing Node handlers behind a Workers Request/Response boundary. */
export async function handleNode(request, handler, env = {}) {
  const url = new URL(request.url)
  const req = request.body ? Readable.fromWeb(request.body) : Readable.from([])
  req.method = request.method
  req.url = url.pathname + url.search
  req.headers = Object.fromEntries(request.headers)
  req.headers.host = url.host
  const trustedIp = request.headers.get('cf-connecting-ip') || 'unknown'
  req.headers['x-forwarded-for'] = trustedIp
  req.socket = { remoteAddress: trustedIp }
  req.query = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    req.query[key] = values.length === 1 ? values[0] : values
  }
  req.platformOrigin = url.origin
  req.platformEnv = env
  const headers = new Headers(), chunks = []
  const res = new EventEmitter()
  Object.assign(res, { statusCode: 200, writableEnded: false, destroyed: false })
  res.setHeader = (key, value) => {
    headers.delete(key)
    for (const item of Array.isArray(value) ? value : [value]) headers.append(key, String(item))
    return res
  }
  res.getHeader = key => headers.get(key)
  res.end = value => {
    if (res.writableEnded) return res
    if (value !== undefined && value !== null) chunks.push(typeof value === 'string' ? Buffer.from(value) : Buffer.from(value))
    res.writableEnded = true
    res.emit('finish')
    return res
  }
  const abort = () => { res.destroyed = true; res.emit('close'); req.destroy() }
  request.signal.addEventListener('abort', abort, { once: true })
  try {
    if (request.signal.aborted) abort()
    else await handler(req, res)
    if (!res.writableEnded) { res.statusCode = request.signal.aborted ? 499 : 500; res.end() }
    const body = request.method === 'HEAD' || [204, 205, 304].includes(res.statusCode) ? null : Buffer.concat(chunks)
    return new Response(body, { status: res.statusCode, headers })
  } catch {
    return Response.json({ error: 'Server error.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  } finally {
    request.signal.removeEventListener('abort', abort)
    if (!req.readableEnded) req.destroy()
  }
}
