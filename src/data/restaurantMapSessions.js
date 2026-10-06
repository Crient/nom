import { loadGoogleMaps } from './googleMapsLoader'
import { haversineMiles, validCoordinates } from '../../shared/nearbyRestaurants.js'
import { recordNearbyUsage } from './nearbyUsage'

export function nearbyMapFrame(restaurants) {
  const useful = restaurants.filter(validCoordinates)
  const anchor = useful.reduce((nearest, place) => !nearest || (place.approximateDistanceMiles ?? Infinity) < (nearest.approximateDistanceMiles ?? Infinity) ? place : nearest, null)
  // Markers remain on the map; only framing excludes distant outliers.
  return anchor ? useful.filter(place => haversineMiles(anchor, place) <= 50) : []
}

export function createRestaurantMapSessions({ load = loadGoogleMaps, documentImpl = () => globalThis.document,
  diagnostic = recordNearbyUsage, mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID } = {}) {
  const sessions = new Map()
  const release = entry => {
    for (const item of entry.markers.values()) { item.listener.remove(); item.marker.map = null }
    entry.sdk.event?.clearInstanceListeners(entry.map); entry.node.remove()
  }
  return {
    async attach({ key, host, restaurants, selectedId, onSelect, signal }) {
      const sdk = await load()
      if (signal?.aborted) return null
      let entry = sessions.get(key)
      if (!entry) {
        const node = documentImpl().createElement('div'); node.className = 'live-map-canvas'
        host.append(node)
        const first = restaurants.find(validCoordinates)
        const map = new sdk.Map(node, { center: { lat: first?.latitude ?? 0, lng: first?.longitude ?? 0 }, zoom: 12,
          mapId: mapId && mapId !== 'your_google_map_id' ? mapId : 'DEMO_MAP_ID', minZoom: 6, maxZoom: 18,
          streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: 'cooperative' })
        entry = { node, map, sdk, markers: new Map(), onSelect, signature: null }; sessions.set(key, entry)
        diagnostic('mapLoads', 1)
        while (sessions.size > 3) { const oldest = sessions.keys().next().value; release(sessions.get(oldest)); sessions.delete(oldest) }
      } else { host.append(entry.node); diagnostic('mapLoads', 0) }
      entry.onSelect = onSelect
      entry.sdk.event?.trigger?.(entry.map, 'resize')
      this.update(key, { restaurants, selectedId, onSelect })
      return entry
    },
    update(key, { restaurants, selectedId, onSelect }) {
      const entry = sessions.get(key)
      if (!entry) return
      entry.onSelect = onSelect
      const useful = restaurants.filter(validCoordinates), ids = new Set(useful.map(place => place.id))
      for (const [id, item] of entry.markers) if (!ids.has(id)) { item.listener.remove(); item.marker.map = null; entry.markers.delete(id) }
      useful.forEach((place, index) => {
        let item = entry.markers.get(place.id)
        if (!item) {
          const label = documentImpl().createElement('span'); label.dataset.placeId = place.placeId
          const marker = new entry.sdk.marker.AdvancedMarkerElement({ map: entry.map, title: place.name,
            position: { lat: place.latitude, lng: place.longitude }, content: label })
          const listener = marker.addListener('click', () => entry.onSelect(place.id))
          item = { marker, label, listener }; entry.markers.set(place.id, item)
        }
        item.label.textContent = String(index + 1); item.label.className = `live-map-pin${place.id === selectedId ? ' live-map-pin-selected' : ''}`
      })
      const signature = useful.map(place => `${place.id}:${place.latitude}:${place.longitude}`).sort().join('|')
      if (signature !== entry.signature) {
        entry.signature = signature
        const frame = nearbyMapFrame(useful)
        if (frame.length === 1) { entry.map.setCenter({ lat: frame[0].latitude, lng: frame[0].longitude }); entry.map.setZoom(13) }
        else if (frame.length > 1) {
          const bounds = new entry.sdk.LatLngBounds()
          frame.forEach(place => bounds.extend({ lat: place.latitude, lng: place.longitude }))
          entry.map.fitBounds(bounds, 48)
        }
      }
    },
    clear() { for (const entry of sessions.values()) release(entry); sessions.clear() },
  }
}
export const restaurantMapSessions = createRestaurantMapSessions()
