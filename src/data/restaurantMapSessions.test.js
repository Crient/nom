// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRestaurantMapSessions, nearbyMapFrame } from './restaurantMapSessions'
import { loadGoogleMaps } from './googleMapsLoader'

function fixture() {
  const constructed = [], markers = []
  class Map {
    constructor(node, options) { this.node = node; this.options = options; this.fitBounds = vi.fn(); this.setCenter = vi.fn(); this.setZoom = vi.fn(); constructed.push(this) }
  }
  class Marker {
    constructor(options) { Object.assign(this, options); markers.push(this) }
    addListener(name, callback) { this.click = callback; return { remove: vi.fn() } }
  }
  class Bounds { constructor() { this.points = [] } extend(point) { this.points.push(point) } }
  const sdk = { Map, marker: { AdvancedMarkerElement: Marker }, LatLngBounds: Bounds, event: { clearInstanceListeners: vi.fn(), trigger: vi.fn() } }
  const load = vi.fn().mockResolvedValue(sdk), diagnostic = vi.fn()
  return { sdk, load, diagnostic, constructed, markers, manager: createRestaurantMapSessions({ load, diagnostic }) }
}
const restaurants = Array.from({ length: 10 }, (_, i) => ({ id: `google:place-${i}`, placeId: `place-${i}`, name: `Place ${i}`, latitude: 40 + i / 100, longitude: -75, approximateDistanceMiles: i }))
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('lazy Google map and reusable sessions', () => {
  it('does nothing until explicitly attached, then plots the same Place IDs and coordinates', async () => {
    const f = fixture(), host = document.createElement('div'), onSelect = vi.fn()
    expect(f.load).not.toHaveBeenCalled(); expect(f.constructed).toHaveLength(0)
    await f.manager.attach({ key: 'search', host, restaurants, selectedId: restaurants[0].id, onSelect })
    expect(f.constructed).toHaveLength(1); expect(f.markers).toHaveLength(10)
    f.markers.forEach((marker, i) => {
      expect(marker.content.dataset.placeId).toBe(restaurants[i].placeId)
      expect(marker.position).toEqual({ lat: restaurants[i].latitude, lng: restaurants[i].longitude })
    })
    f.markers[5].click(); expect(onSelect).toHaveBeenCalledWith(restaurants[5].id)
    f.manager.clear()
  })
  it('reuses a map on List/Map and detail/back navigation without another constructor load', async () => {
    const f = fixture(), a = document.createElement('div'), b = document.createElement('div')
    await f.manager.attach({ key: 'search', host: a, restaurants, onSelect: vi.fn() })
    await f.manager.attach({ key: 'search', host: b, restaurants, onSelect: vi.fn() })
    expect(f.constructed).toHaveLength(1); expect(b.firstChild).toBe(f.constructed[0].node)
    expect(f.diagnostic.mock.calls.map(row => row[1])).toEqual([1, 0]); f.manager.clear()
  })
  it('updates markers and bounds locally when filters change', async () => {
    const f = fixture(), host = document.createElement('div')
    const entry = await f.manager.attach({ key: 'search', host, restaurants, onSelect: vi.fn() })
    f.manager.update('search', { restaurants: restaurants.slice(0, 2), onSelect: vi.fn() })
    expect(entry.markers.size).toBe(2); expect(f.markers[9].map).toBeNull()
    expect(f.load).toHaveBeenCalledTimes(1); expect(f.constructed[0].fitBounds).toHaveBeenCalledTimes(2); f.manager.clear()
  })
  it('keeps distant markers but prevents outliers from determining initial bounds', async () => {
    const outlier = { ...restaurants[9], latitude: 0, longitude: 0 }
    const f = fixture(), entry = await f.manager.attach({ key: 'search', host: document.createElement('div'), restaurants: [restaurants[0], restaurants[1], outlier], onSelect: vi.fn() })
    expect(entry.markers.size).toBe(3); expect(nearbyMapFrame([restaurants[0], restaurants[1], outlier])).toHaveLength(2)
    expect(f.constructed[0].fitBounds.mock.calls[0][0].points).toHaveLength(2); f.manager.clear()
  })
  it('frames a single result sensibly and never constructs an abandoned map', async () => {
    const f = fixture(), controller = new AbortController(); controller.abort()
    expect(await f.manager.attach({ key: 'cancelled', host: document.createElement('div'), restaurants, signal: controller.signal })).toBeNull()
    expect(f.constructed).toHaveLength(0)
    await f.manager.attach({ key: 'single', host: document.createElement('div'), restaurants: [restaurants[0]], onSelect: vi.fn() })
    expect(f.constructed[0].setZoom).toHaveBeenCalledWith(13); f.manager.clear()
  })
  it('rejects an absent browser key without appending a script', async () => {
    await expect(loadGoogleMaps({ key: '' })).rejects.toThrow('MAP_NOT_CONFIGURED')
    expect(document.querySelector('script[data-nom-google-maps]')).toBeNull()
  })
  it('loads only one public-key Maps script and no Places library', async () => {
    // Keep SDK script insertion observable without allowing happy-dom to download it.
    let script
    vi.spyOn(document.head, 'append').mockImplementation(element => { script = element })
    const promise = loadGoogleMaps({ key: 'test-public-browser-key' })
    expect(loadGoogleMaps({ key: 'test-public-browser-key' })).toBe(promise)
    const url = new URL(script.src)
    expect(url.hostname).toBe('maps.googleapis.com'); expect(url.searchParams.get('libraries')).toBe('marker')
    expect(script.src).not.toContain('GOOGLE_PLACES_API_KEY')
    vi.stubGlobal('google', { maps: { Map: function() {}, marker: { AdvancedMarkerElement: function() {} } } })
    globalThis.__nomGoogleMapsReady(); await promise; script.remove()
  })
})
