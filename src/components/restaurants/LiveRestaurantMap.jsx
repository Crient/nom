import { useEffect, useRef, useState } from 'react'
import { restaurantMapSessions } from '../../data/restaurantMapSessions'
import Button from '../ui/Button'

export default function LiveRestaurantMap({ restaurants, selectedId, onSelect, sessionKey, active, compact = false }) {
  const host = useRef(null), latest = useRef({ restaurants, selectedId, onSelect })
  latest.current = { restaurants, selectedId, onSelect }
  const [status, setStatus] = useState('loading'), [retry, setRetry] = useState(0)
  useEffect(() => {
    const unavailable = () => setStatus('error')
    globalThis.addEventListener('nom-google-map-auth-error', unavailable)
    return () => globalThis.removeEventListener('nom-google-map-auth-error', unavailable)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    restaurantMapSessions.attach({ key: sessionKey, host: host.current, ...latest.current, signal: controller.signal })
      .then(entry => { if (entry && !controller.signal.aborted) setStatus('ready') })
      .catch(error => { if (!controller.signal.aborted) setStatus(error.message === 'MAP_NOT_CONFIGURED' ? 'configuration' : 'error') })
    return () => controller.abort()
  }, [sessionKey, retry])
  useEffect(() => { if (status === 'ready' && active) restaurantMapSessions.update(sessionKey, latest.current) }, [restaurants, selectedId, onSelect, sessionKey, status, active])
  return <section className="live-restaurant-map" aria-label="Google restaurant map">
    <div ref={host} className="live-map-host" hidden={status === 'configuration' || status === 'error'} />
    {status === 'loading' && <p role="status">Loading map…</p>}
    {status === 'configuration' && <p role="status">{import.meta.env.DEV ? 'Map is not configured locally. Add the separate browser Maps key to .env.local and restart the dev server.' : 'Map is unavailable. Use the list or open a restaurant in Google Maps.'}</p>}
    {status === 'error' && <div role="alert"><p>Map unavailable right now. Your restaurant list is still available.</p><Button variant="secondary" onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Try loading map again</Button></div>}
    {status === 'ready' && !compact && <p className="restaurant-meta">Nearby places are framed first. Zoom out to explore farther matches.</p>}
  </section>
}
