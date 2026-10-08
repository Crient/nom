import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../../data/googleMapsLoader'
import { recordNearbyUsage } from '../../data/nearbyUsage'
import { validCoordinates } from '../../../shared/nearbyRestaurants.js'
import { restaurantActionLinks } from '../../data/restaurantActions'
import '../../styles/nearby.css'

/** Display only: marker positions never constitute verification evidence. */
export default function VisitVerificationMap({ restaurant, userPosition, testMode = false, attribution }) {
  const host = useRef(null), map = useRef(null)
  const [status, setStatus] = useState('loading'), [attempt, setAttempt] = useState(0)
  const trusted = !testMode && restaurant.source === 'google-places' && !restaurant.metadataOnly && validCoordinates(restaurant)
  useEffect(() => {
    let active = true, entry
    const unavailable = () => { if (active) setStatus('error') }
    globalThis.addEventListener('nom-google-map-auth-error', unavailable)
    if (!trusted) setStatus(testMode ? 'preview' : 'coordinates')
    else {
      setStatus('loading')
      loadGoogleMaps().then(sdk => {
        if (!active) return
        const instance = new sdk.Map(host.current, {
          center: { lat: restaurant.latitude, lng: restaurant.longitude }, zoom: 17, maxZoom: 18,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          disableDefaultUI: true, gestureHandling: 'none', keyboardShortcuts: false,
        })
        const venue = new sdk.marker.AdvancedMarkerElement({ map: instance, title: restaurant.name,
          position: { lat: restaurant.latitude, lng: restaurant.longitude } })
        entry = { sdk, instance, venue, user: null }; map.current = entry
        recordNearbyUsage('mapLoads', 1); setStatus('ready')
      }).catch(error => { if (active) setStatus(error.message === 'MAP_NOT_CONFIGURED' ? 'configuration' : 'error') })
    }
    return () => {
      active = false; globalThis.removeEventListener('nom-google-map-auth-error', unavailable)
      if (entry) {
        entry.venue.map = null
        if (entry.user) entry.user.map = null
        entry.sdk.event?.clearInstanceListeners(entry.instance)
        entry.instance.getDiv?.().replaceChildren()
      }
      map.current = null
    }
  }, [trusted, restaurant.id, restaurant.name, restaurant.latitude, restaurant.longitude, testMode, attempt])
  useEffect(() => {
    const entry = map.current
    if (status !== 'ready' || !entry) return
    if (entry.user) { entry.user.map = null; entry.user = null }
    if (validCoordinates(userPosition)) {
      const dot = document.createElement('span'); dot.className = 'visit-map-user-dot'
      entry.user = new entry.sdk.marker.AdvancedMarkerElement({ map: entry.instance, title: 'Your current location',
        position: { lat: userPosition.latitude, lng: userPosition.longitude }, content: dot })
      const bounds = new entry.sdk.LatLngBounds()
      bounds.extend({ lat: restaurant.latitude, lng: restaurant.longitude })
      bounds.extend({ lat: userPosition.latitude, lng: userPosition.longitude })
      entry.instance.fitBounds(bounds, 62)
    } else {
      entry.instance.setCenter({ lat: restaurant.latitude, lng: restaurant.longitude }); entry.instance.setZoom(17)
    }
    // No storage, shared map session, location watch, or background tracking.
  }, [status, userPosition?.latitude, userPosition?.longitude, restaurant.latitude, restaurant.longitude])
  const messages = { loading: 'Loading restaurant map…', coordinates: 'Restaurant map location isn’t available.',
    configuration: 'Map unavailable', error: 'Map unavailable', preview: 'Map preview only — no live location is requested.' }
  const directions = restaurantActionLinks(restaurant).directions
  return <section className="visit-map" aria-label="Restaurant verification map">
    {/* One rounded SDK viewport includes its native logo and attribution footer. */}
    <div className="visit-map-frame" data-map-status={status}>
      <div ref={host} className="visit-map-canvas" aria-label={`Map of ${restaurant.name}`} />
      {status !== 'ready' && <div className="visit-map-status" role="status"><p>{messages[status]}</p>
        {['error', 'configuration'].includes(status) && <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
      </div>}
    </div>
    <div className="visit-map-caption">
      {directions && <a href={directions} target="_blank" rel="noopener noreferrer">View on Google Maps</a>}
      {attribution}
    </div>
  </section>
}
