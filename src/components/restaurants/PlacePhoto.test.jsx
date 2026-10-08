// @vitest-environment happy-dom
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlacePhoto from './PlacePhoto'
import { placePhotoService } from '../../data/placeExtrasService'

let root, fetchPhoto, observer
const venue = () => ({ name: 'Cafe Nom', placeId: 'cafe', photo: { name: 'places/cafe/photos/one', observedAt: Date.now(),
  googleMapsUri: 'https://www.google.com/maps/photos/?id=one', authorAttributions: [{ displayName: 'Author', uri: 'https://maps.google.com/maps/contrib/123' }] } })
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  placePhotoService.clear(); root = createRoot(document.getElementById('root'))
  fetchPhoto = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photoUri: 'https://lh3.googleusercontent.com/one', photoMediaCalls: 1 }) })
  vi.stubGlobal('fetch', fetchPhoto)
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { observer = callback } observe() {} disconnect() {}
  })
})
afterEach(async () => { await act(() => root.unmount()); placePhotoService.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const render = (restaurant = venue(), eager = true) => act(() => root.render(<PlacePhoto restaurant={restaurant} eager={eager} />))
describe('restaurant photo rendering and recovery', () => {
  it.each([true, false])('keeps a 44px target around a smaller visible overlay (compact=%s)', async compact => {
    const style = document.createElement('style')
    style.textContent = readFileSync('src/styles/nearby.css', 'utf8')
    document.head.append(style)
    try {
      await act(() => root.render(<PlacePhoto restaurant={venue()} eager compact={compact} />))
      const button = document.querySelector('.place-photo-expand')
      expect(button.getAttribute('aria-label')).toBe('View larger photo and credits for Cafe Nom')
      expect(getComputedStyle(button).width).toBe('44px')
      expect(getComputedStyle(button).height).toBe('44px')
      expect(getComputedStyle(button.querySelector('span')).width).toBe('26px')
      expect(getComputedStyle(button.querySelector('span')).fontSize).toBe('14px')
      await act(() => button.click())
      expect(document.querySelector('[role="dialog"]')).toBeTruthy()
      expect(fetchPhoto).toHaveBeenCalledTimes(1)
    } finally { style.remove() }
  })
  it('keeps a designed loading surface until the media URI finishes loading, then removes it', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    await render()
    expect(document.querySelector('figure').dataset.mediaState).toBe('loading')
    expect(document.querySelector('.place-photo-loading-image')).toBeTruthy()
    const image = document.querySelector('img')
    await act(() => image.dispatchEvent(new Event('load')))
    expect(document.querySelector('figure').dataset.mediaState).toBe('ready')
    expect(document.querySelector('.place-photo-loading-image')).toBeNull()
    expect(document.querySelector('figcaption')).toBeNull()
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
  it('recognizes a cached complete image on mount and reuses media on remount', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800)
    await render()
    expect(document.querySelector('img').classList.contains('is-ready')).toBe(true)
    await act(() => root.unmount()); root = createRoot(document.getElementById('root')); await render()
    expect(document.querySelector('img').classList.contains('is-ready')).toBe(true)
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
  it('loads available photos automatically when IntersectionObserver is unsupported', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    await render(venue(), false)
    expect(document.querySelector('img').src).toBe('https://lh3.googleusercontent.com/one')
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toContain('Load photo')
  })
  it('keeps offscreen photo requests lazy and fades a successfully loaded image', async () => {
    await render(venue(), false); expect(fetchPhoto).not.toHaveBeenCalled()
    await act(() => observer([{ isIntersecting: true }]))
    const image = document.querySelector('img')
    await act(() => image.dispatchEvent(new Event('load')))
    expect(image.classList.contains('is-ready')).toBe(true); expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
  it('renders a designed fallback after an image fails instead of a blank invisible image', async () => {
    await render(); await act(() => document.querySelector('img').dispatchEvent(new Event('error')))
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('.place-photo-fallback').dataset.mediaState).toBe('error')
    expect(document.querySelector('.place-photo-monogram').textContent).toBe('C')
    expect(document.querySelector('button').getAttribute('aria-label')).toBe('Retry photo for Cafe Nom')
    expect(document.body.textContent).not.toContain('Retry photo')
  })
  it('only retries an API error on deliberate action and then recovers', async () => {
    fetchPhoto.mockResolvedValueOnce({ ok: false, json: async () => ({ error: { code: 'PROVIDER_UNAVAILABLE' } }) })
    await render(); await render(); expect(fetchPhoto).toHaveBeenCalledTimes(1)
    await act(() => document.querySelector('button').click())
    expect(fetchPhoto).toHaveBeenCalledTimes(2); expect(document.querySelector('img')).toBeTruthy()
  })
  it('keeps quota failures subtle and cached across preview/list remounts, with no repeated requests', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    fetchPhoto.mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { code: 'QUOTA_LIMIT', source: 'nom-budget-day', retryAfterMs: 60_000 }, photoMediaCalls: 0 }) })
    await render(); await render()
    expect(document.body.textContent).toContain('Photo paused')
    expect(document.body.textContent).not.toContain('Retry photo')
    expect(document.querySelector('[role="img"]').getAttribute('aria-label')).toContain('temporarily paused')
    await act(() => document.querySelector('.place-photo-retry').click())
    await act(() => root.unmount()); root = createRoot(document.getElementById('root')); await render()
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith('[Nom place media]', expect.objectContaining({ code: 'QUOTA_LIMIT', source: 'nom-budget-day', httpStatus: 429, calls: 0 }))
  })
  it.each(['PHOTO_RESOURCE_INVALID', 'PHOTO_RESOURCE_UNAVAILABLE'])('requires a permitted fresh search for %s instead of retrying the old resource', async code => {
    fetchPhoto.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { code, source: 'google', upstreamStatus: 400 }, photoMediaCalls: 1 }) })
    const restaurant = venue(); restaurant.photo.observedAt -= 5
    await render(restaurant); await render(restaurant)
    expect(document.body.textContent).toContain('Refresh for photos')
    expect(document.querySelector('.place-photo-retry')).toBeNull()
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
    await render({ ...restaurant, photo: { ...restaurant.photo, observedAt: restaurant.photo.observedAt + 1 } })
    expect(fetchPhoto).toHaveBeenCalledTimes(2)
  })
  it('does not carry a failed-photo state into a newly selected place without a photo', async () => {
    await render(); await act(() => document.querySelector('img').dispatchEvent(new Event('error')))
    await render({ name: 'New cafe', placeId: 'new' })
    expect(document.querySelector('.place-photo-fallback').dataset.mediaState).toBe('missing')
    expect(document.body.textContent).toContain('A spot to discover')
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
  it('keeps a clean individual source credit when the photo has no authors', async () => {
    const restaurant = venue(); restaurant.photo.authorAttributions = []
    await render(restaurant)
    expect(document.querySelector('figcaption')).toBeNull()
    await act(() => document.querySelector('.place-photo-expand').click())
    expect(document.querySelector('.place-photo-source').href).toContain('/maps/photos/?id=one')
  })
  it('removes thumbnail credit rows but makes the larger attributed photo accessible without a new request', async () => {
    const restaurant = venue(); restaurant.photo.authorAttributions[0].photoUri = 'https://lh3.googleusercontent.com/author'
    await render(restaurant)
    expect(document.querySelector('figcaption')).toBeNull()
    expect(document.body.textContent).not.toContain('Author')
    const expand = document.querySelector('.place-photo-expand')
    await act(() => { expand.focus(); expand.click() })
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.querySelector('img').src).toBe('https://lh3.googleusercontent.com/one')
    expect(dialog.querySelector('.place-photo-viewer-credits a').textContent).toBe('Author')
    expect(dialog.querySelector('.place-photo-author-avatar').src).toBe('https://lh3.googleusercontent.com/author')
    expect(dialog.querySelector('.place-photo-source').href).toContain('/maps/photos/?id=one')
    await act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(expand)
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
  it('retains full author attribution directly beside a large detail photo', async () => {
    await act(() => root.render(<PlacePhoto restaurant={venue()} eager hero />))
    expect(document.querySelector('figcaption .place-photo-credit').textContent).toContain('Author')
    expect(document.querySelector('.place-photo-expand')).toBeNull()
  })
  it('labels stale and metadata-only media without an automatic search or unsafe photo request', async () => {
    const restaurant = venue(); restaurant.photo.observedAt -= 11 * 60 * 1000
    await render(restaurant)
    expect(document.querySelector('.place-photo-fallback').dataset.mediaState).toBe('stale')
    expect(document.body.textContent).toContain('Refresh for photos'); expect(fetchPhoto).not.toHaveBeenCalled()
    await render({ name: 'Saved place', placeId: 'saved', metadataOnly: true })
    expect(document.querySelector('.place-photo-fallback').dataset.mediaState).toBe('saved')
    expect(fetchPhoto).not.toHaveBeenCalled()
  })
  it('recovers after deliberate search refresh returns a fresh observation of the same photo resource', async () => {
    const restaurant = venue(); restaurant.photo.observedAt -= 11 * 60 * 1000
    await render(restaurant)
    expect(document.querySelector('.place-photo-fallback').dataset.mediaState).toBe('stale')
    expect(fetchPhoto).not.toHaveBeenCalled()
    await render({ ...restaurant, photo: { ...restaurant.photo, observedAt: Date.now() } })
    expect(document.querySelector('img').src).toBe('https://lh3.googleusercontent.com/one')
    expect(fetchPhoto).toHaveBeenCalledTimes(1)
  })
})
