// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import App from '../App'
import { routes } from '../routes'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'
import { mockSupabase, USER_A } from '../test/accountFixtures'
import { surpriseSession } from '../utils/surpriseSession'
import * as restaurantProvider from '../data/restaurantProvider'

// Synthetic DOM/storage only. Browser painting/HTTP delivery is separate QA.
let root, sdk
beforeEach(() => {
  installMockNearbyProvider(); surpriseSession.reset()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ location: false, qr: false, receipt: false }) })))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root')); sdk = null
})
afterEach(async () => {
  await act(() => root.unmount()); surpriseSession.reset(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals()
})
async function mount(path) {
  window.history.replaceState({}, '', path)
  await act(() => root.render(<App supabaseClient={sdk} />))
}
async function reload() {
  await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
  await act(() => root.render(<App supabaseClient={sdk} />))
}
async function click(label) {
  const node = [...document.querySelectorAll('button,a')].find(n => n.getAttribute('aria-label') === label || n.textContent.trim() === label)
  expect(node, label).toBeTruthy(); await act(() => node.click())
}
const choices = { foodType: 'noodle', flavors: ['spicy'], adventurousness: 'adventurous', region: 'southeast-asia' }
const paths = routes[0].children.filter(route => route.path !== '*' && !route.path?.startsWith('dev/')).map(route => '/' + (route.path ?? '')
  .replace(':dishId', 'lort-cha').replace(':restaurantId', 'google:trusted-place').replace(':visitId', 'missing-visit')
  .replace(':boxId', 'missing-box').replace(':countryId', 'cambodia').replace(':collectibleId', 'ziggy'))

describe.each(['Guest', 'account'])('overnight direct route and reload (%s)', mode => {
  it.each(paths)('%s has a stable screen or intentional guard after reload', async path => {
    if (mode === 'account') sdk = mockSupabase(USER_A)
    writeLocalState(STORAGE_KEYS.discovery, choices)
    await mount(path)
    const settled = window.location.pathname
    // Missing visits/boxes and locked collectibles retain explicit empty states.
    expect(document.querySelector('.nom-app-shell')).toBeTruthy()
    expect(document.body.textContent.trim().length).toBeGreaterThan(20)
    expect(document.body.textContent).not.toContain('Loading Nom…')
    // Account answers are device/account scoped; Guest preferences never leak.
    const expected = mode === 'account' && path.startsWith('/recommendations') && !['/recommendations/surprise', '/recommendations/nearby'].includes(path)
      ? '/discover/food-type' : path
    expect(settled).toBe(expected)
    const title = document.querySelector('h1')?.textContent
    await reload()
    expect(window.location.pathname).toBe(settled)
    if (path !== '/recommendations/surprise') expect(document.querySelector('h1')?.textContent).toBe(title)
    expect(document.querySelector('.nom-app-shell')).toBeTruthy()
  })
})
describe('overnight edge navigation and deck torture', () => {
  it.each([
    ['/recommendations/lort-cha/nearby/not-a-restaurant', 'Restaurant not found'],
    ['/collections/not-a-country', 'Collection not found'],
    ['/collections/cambodia/not-a-collectible', 'Collectible not found'],
    ['/collections/cambodia/ziggy', 'Collectible locked'],
    ['/visits/missing/verify', 'Visit not found'],
    ['/visits/missing/feedback', 'Visit not found'],
    ['/visits/missing/logged', 'Experience not found'],
    ['/boxes/missing/reveal', 'Mystery Box not found'],
  ])('retains an honest missing/locked state at %s', async (path, title) => {
    writeLocalState(STORAGE_KEYS.discovery, choices); await mount(path)
    expect(document.body.textContent).toContain(title)
    expect(window.location.pathname).toBe(path)
  })
  it('documents the existing unknown-route Home fallback without a loop', async () => {
    await mount('/this-route-does-not-exist')
    expect(window.location.pathname).toBe('/home'); await reload()
    expect(window.location.pathname).toBe('/home')
  })
  it('documents the existing invalid-dish fallback to results instead of a not-found screen', async () => {
    writeLocalState(STORAGE_KEYS.discovery, choices); await mount('/recommendations/not-a-dish')
    expect(window.location.pathname).toBe('/recommendations')
    expect(document.body.textContent).toContain('Your Top Matches')
  })
  it('returns a fresh Guest to an encoded Google restaurant after all discovery steps', async () => {
    const path = '/recommendations/lort-cha/nearby/google%3Atrusted-place'
    vi.mocked(restaurantProvider.findRestaurant).mockResolvedValue({ restaurant: { id: 'google:trusted-place', placeId: 'trusted-place', name: 'Controlled saved restaurant',
      source: 'google-places', metadataOnly: true, address: '', attributions: [] } })
    await mount(path); expect(window.location.pathname).toBe('/discover/food-type')
    await click('Noodle'); await click('Continue'); await click('Spicy'); await click('Continue')
    await act(() => document.querySelector('.discovery-options button').click()); await click('Continue')
    await act(() => document.querySelector('.discovery-options button').click()); await click('Continue')
    expect(window.location.pathname).toBe(path)
    expect(document.querySelector('.restaurant-live-page')).toBeTruthy()
  })
  it.each(['!!! <script>alert(1)</script> & 😀', 'x'.repeat(5000)])('special/long search is inert, empty, clearable and focusable %#', async query => {
    await mount('/explore?q=' + encodeURIComponent(query))
    const input = document.querySelector('input[role="searchbox"]')
    expect(input.value).toBe(query); expect(document.body.textContent).toContain('No dishes found')
    expect(document.querySelector('script')).toBeNull()
    expect(document.querySelectorAll('[aria-label="Clear search"]')).toHaveLength(1)
    await click('Clear search'); expect(input.value).toBe(''); expect(document.activeElement).toBe(input)
    expect(document.querySelectorAll('[aria-label="Clear search"]')).toHaveLength(0)
    expect(document.querySelectorAll('article')).toHaveLength(201)
  })
  it('keeps manual history unverified across refresh, explicit Guest merge and a second synthetic device', async () => {
    writeLocalState(STORAGE_KEYS.discovery, choices)
    await mount('/recommendations/lort-cha/nearby/preview-thmor-da'); await click('I ate here')
    await click('Couldn’t verify automatically?'); await click('Log without verificationSave to history without adding progress'); await click('Save without verification')
    expect(document.body.textContent).toContain('Be honest. Your feedback won’t affect Mystery Box progress.')
    await click('Loved it!'); await click('Continue')
    expect(document.body.textContent).toContain('This meal doesn’t count toward country or Mystery Box progress.')
    const guest = JSON.parse(localStorage.getItem(STORAGE_KEYS.experience)).data
    expect(guest.logs).toHaveLength(1); expect(guest.logs[0].verification).toMatchObject({ status: 'unverified', verified: false, method: 'none' })
    expect(guest.openedBoxes).toEqual([])
    await mount('/history?view=meals'); await reload(); expect(document.querySelectorAll('.activity-card')).toHaveLength(1)
    sdk = mockSupabase(USER_A); await reload()
    expect(sdk.rows.meal_logs).toEqual([]); await click('Merge & Sync')
    expect(sdk.rows.meal_logs).toHaveLength(1)
    expect(sdk.rows.meal_logs[0]).toMatchObject({ verified: false, verification_status: 'unverified', verification_method: 'none' })
    expect(sdk.rows.opened_boxes).toEqual([])
    const database = sdk.rows
    await act(() => root.unmount()); localStorage.clear(); root = createRoot(document.getElementById('root'))
    sdk = mockSupabase(USER_A, database); await mount('/history?view=meals')
    expect(document.querySelectorAll('.activity-card')).toHaveLength(1)
    await mount('/progress'); expect(document.querySelector('a[href^="/boxes/"]')).toBeNull()
  })
  it('documents recovery-form reload losing consumed PKCE readiness (Auth is intentionally unchanged)', async () => {
    sdk = mockSupabase(); await mount('/account/reset-password?code=synthetic-recovery')
    expect(document.querySelector('#reset-password')).toBeTruthy(); expect(window.location.search).toBe('')
    await reload()
    expect(window.location.pathname).toBe('/account/reset-password')
    expect(document.querySelector('#reset-password')).toBeNull()
    expect(document.querySelector('[role="alert"]').textContent).toContain('missing or expired')
    expect(sdk.auth.exchangeCodeForSession).toHaveBeenCalledOnce()
  })
  it('keeps rear images/nodes, focus, undo and preferences through 25 consecutive swipes', async () => {
    vi.useFakeTimers(); writeLocalState(STORAGE_KEYS.discovery, choices)
    await mount('/home'); const preferences = localStorage.getItem(STORAGE_KEYS.discovery)
    await click('Surprise me'); expect(window.location.pathname).toBe('/recommendations/surprise')
    const skip = document.querySelector('.surprise-controls button'), seen = []
    await act(() => skip.focus())
    for (let index = 0; index < 25; index++) {
      const front = document.querySelector('.surprise-dish-card'), rear = document.querySelector('.surprise-next-card')
      seen.push(front.getAttribute('aria-label'))
      const image = rear.querySelector('img'), source = image.getAttribute('src')
      Object.defineProperty(front, 'clientWidth', { value: 320 })
      await act(() => front.dispatchEvent(new PointerEvent('pointerdown', { clientX: 220, clientY: 20, pointerId: index + 1, button: 0, isPrimary: true, bubbles: true })))
      await act(() => front.dispatchEvent(new PointerEvent('pointerup', { clientX: 50, clientY: 20, pointerId: index + 1, button: 0, isPrimary: true, bubbles: true })))
      await act(() => vi.advanceTimersByTimeAsync(240))
      expect(document.querySelector('.surprise-dish-card')).toBe(rear)
      expect(rear.querySelector('img')).toBe(image); expect(image.getAttribute('src')).toBe(source)
      expect(document.activeElement).toBe(skip)
    }
    expect(new Set(seen).size).toBe(25)
    await click('↶ Undo skip'); await act(() => vi.advanceTimersByTimeAsync(240))
    expect(document.querySelector('.surprise-dish-card').getAttribute('aria-label')).toBe(seen.at(-1))
    expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(preferences)
    await click('Try this'); await act(() => vi.advanceTimersByTimeAsync(240))
    expect(window.location.search).toBe('?surprise=1'); expect(document.querySelector('h1').textContent).toContain(seen.at(-1))
    await reload(); expect(localStorage.getItem(STORAGE_KEYS.discovery)).toBe(preferences)
  })
})
