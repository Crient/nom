// @vitest-environment happy-dom
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import VisitVerificationMap from './VisitVerificationMap'
import { loadGoogleMaps } from '../../data/googleMapsLoader'
vi.mock('../../data/googleMapsLoader', () => ({ loadGoogleMaps: vi.fn() }))
vi.mock('../../data/nearbyUsage', () => ({ recordNearbyUsage: vi.fn() }))
const venue = { id: 'google:venue', placeId: 'venue', name: 'Selected venue', source: 'google-places', latitude: 42.34, longitude: -71.07 }
let root, sdk, maps, markers
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  maps = []; markers = []
  sdk = {
    Map: class {
      constructor(host, options) { this.host = host; this.options = options; this.fitBounds = vi.fn(); this.setCenter = vi.fn(); this.setZoom = vi.fn(); maps.push(this) }
      getDiv() { return this.host }
    },
    marker: { AdvancedMarkerElement: class { constructor(options) { Object.assign(this, options); markers.push(this) } } },
    LatLngBounds: class { constructor() { this.points = [] } extend(point) { this.points.push(point) } },
    event: { clearInstanceListeners: vi.fn() },
  }
  loadGoogleMaps.mockReset().mockResolvedValue(sdk)
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks() })
const render = (props = {}) => act(() => root.render(<VisitVerificationMap restaurant={venue} {...props} />))
describe('real SDK visit map with temporary display markers', () => {
  it('plots trusted restaurant coordinates, adds a fresh user marker and frames their relationship', async () => {
    const before = localStorage.length
    await render()
    expect(maps[0].options.center).toEqual({ lat: venue.latitude, lng: venue.longitude })
    expect(markers[0].title).toBe(venue.name); expect(markers[0].position).toEqual(maps[0].options.center)
    expect(maps[0].options.disableDefaultUI).toBe(true)
    await render({ userPosition: { latitude: 42.3401, longitude: -71.0701 } })
    expect(loadGoogleMaps).toHaveBeenCalledTimes(1)
    expect(markers[1].title).toBe('Your current location')
    expect(maps[0].fitBounds.mock.calls[0][0].points).toEqual([{ lat: venue.latitude, lng: venue.longitude }, { lat: 42.3401, lng: -71.0701 }])
    expect(localStorage.length).toBe(before)
    await render() // Dropping the page-only reading removes the user marker.
    expect(markers[1].map).toBeNull()
    await act(() => root.render(null))
    expect(markers[0].map).toBeNull(); expect(sdk.event.clearInstanceListeners).toHaveBeenCalledWith(maps[0])
  })
  it.each([{ testMode: true }, { restaurant: { ...venue, metadataOnly: true } }, { restaurant: { ...venue, latitude: undefined } }, { restaurant: { ...venue, source: 'preview' } }])('never constructs a live map from QA/missing/untrusted coordinates %#', async props => {
    await render(props)
    expect(loadGoogleMaps).not.toHaveBeenCalled(); expect(maps).toHaveLength(0)
    expect(document.querySelector('[role="status"]')).toBeTruthy()
  })
  it('shows an honest map-only configuration failure without fake map artwork', async () => {
    loadGoogleMaps.mockRejectedValue(new Error('MAP_NOT_CONFIGURED'))
    await render()
    expect(document.body.textContent).toContain('Map unavailable')
    expect(document.querySelector('.visit-map-frame').dataset.mapStatus).toBe('configuration')
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('a').href).toContain('destination_place_id=venue')
  })
  it('keeps an SDK failure in the same frame, preserves attribution and allows a real retry', async () => {
    const style = document.createElement('style')
    style.textContent = readFileSync('src/styles/experience.css', 'utf8'); document.head.append(style)
    try {
      loadGoogleMaps.mockRejectedValueOnce(new Error('MAP_UNAVAILABLE'))
      await render({ attribution: <span>Google Maps attribution</span> })
      const frame = document.querySelector('.visit-map-frame')
      expect(frame.dataset.mapStatus).toBe('error')
      expect(getComputedStyle(frame).aspectRatio).toBe('251 / 299')
      expect(['0', '0px']).toContain(getComputedStyle(document.querySelector('.visit-map-status')).inset)
      expect(document.querySelector('.visit-map-caption').textContent).toContain('Google Maps attribution')
      expect(document.querySelector('[role="status"]').textContent).toBe('Map unavailableTry again')
      await act(() => document.querySelector('[role="status"] button').click())
      expect(loadGoogleMaps).toHaveBeenCalledTimes(2)
      expect(frame.dataset.mapStatus).toBe('ready')
      expect(getComputedStyle(frame).aspectRatio).toBe('251 / 299')
      expect(document.querySelector('[role="status"]')).toBeNull()
    } finally { style.remove() }
  })
  it('does not construct a map after leaving while SDK load is unresolved', async () => {
    let finish; loadGoogleMaps.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    await render(); await act(() => root.render(null)); await act(() => finish(sdk))
    expect(maps).toHaveLength(0); expect(markers).toHaveLength(0)
  })
  it('uses one rounded SDK frame without masking its native attribution footer', async () => {
    await render()
    const host = document.querySelector('.visit-map-canvas')
    expect(host).toBeTruthy()
    expect(host.parentElement.className).toBe('visit-map-frame')
    // Native SDK branding is neither replaced nor hidden with a display rule.
    const css = readFileSync('src/styles/experience.css', 'utf8')
    expect(css).not.toMatch(/\.visit-map-canvas[^}]*mask-/)
    expect(css).toContain('border-radius: 16px; overflow: hidden;')
    expect(css).not.toMatch(/\.gm-style[^}]*display:\s*none/)
  })
})
