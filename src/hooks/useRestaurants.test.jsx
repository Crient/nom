// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ provider: vi.fn(), locate: vi.fn() }))
vi.mock('../data/restaurantSearchState', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, restaurantSearchState: actual.createRestaurantSearchState({
    provider: fixture.provider, locate: fixture.locate, getCached: () => null,
  }) }
})
import { restaurantSearchState } from '../data/restaurantSearchState'
import { useRestaurants } from './useRestaurants'

function OpenedDish() {
  const result = useRestaurants('lort-cha', { autoLoad: true })
  return <p data-status={result.status} data-count={result.restaurants.length}>{result.busy ? 'Loading' : result.status} {result.locationNotice}</p>
}
let root
beforeEach(() => {
  restaurantSearchState.reset(); fixture.provider.mockReset(); fixture.locate.mockReset()
  fixture.locate.mockResolvedValue({ latitude: 40, longitude: -75 })
  vi.stubGlobal('navigator', { permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) } })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); restaurantSearchState.reset(); vi.unstubAllGlobals() })
describe('opened dish auto-load cancellation', () => {
  it('revalidates cached distance on remount without issuing a second Places search', async () => {
    fixture.provider.mockResolvedValue({ restaurants: [{ id: 'google:old', latitude: 40, longitude: -75,
      name: 'Old place', approximateDistanceMiles: 0 }], source: 'google-places', searchedAt: Date.now(), apiCalls: 1 })
    await act(() => root.render(<OpenedDish />))
    expect(document.querySelector('[data-status]').dataset.count).toBe('1')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    fixture.locate.mockResolvedValue({ latitude: 34.05, longitude: -118.24 })
    await act(() => root.render(<OpenedDish />))
    expect(document.querySelector('[data-status]').dataset.count).toBe('0')
    expect(document.querySelector('[data-status]').textContent).toContain('previous search area')
    expect(fixture.locate).toHaveBeenCalledTimes(2); expect(fixture.provider).toHaveBeenCalledTimes(1)
  })
  it('resumes when an abandoned request settles after the same dish remounts', async () => {
    let rejectFirst
    fixture.provider.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectFirst = reject }))
      .mockResolvedValue({ restaurants: [], source: 'google-places', searchedAt: Date.now(), apiCalls: 1 })
    await act(() => root.render(<OpenedDish />))
    expect(document.querySelector('[data-status]').dataset.status).toBe('loading')
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(fixture.provider.mock.calls[0][0].signal.aborted).toBe(true)
    await act(() => root.render(<OpenedDish />))
    expect(fixture.provider).toHaveBeenCalledTimes(1)
    await act(() => rejectFirst(new DOMException('Cancelled', 'AbortError')))
    expect(document.querySelector('[data-status]').dataset.status).toBe('ready')
    expect(fixture.provider).toHaveBeenCalledTimes(2)
    await act(() => root.render(<OpenedDish />))
    expect(fixture.provider).toHaveBeenCalledTimes(2)
  })
})
