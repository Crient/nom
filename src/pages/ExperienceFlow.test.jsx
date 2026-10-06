// @vitest-environment happy-dom
import { actAndLoadRoutes as act } from '../test/routeAct'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'

let root
beforeEach(() => {
  installMockNearbyProvider()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  window.history.replaceState({}, '', '/discover/food-type')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
async function click(label) {
  const control = [...document.querySelectorAll('button,a')].find(element => element.getAttribute('aria-label') === label || element.textContent.trim() === label)
  expect(control, `Missing ${label}`).toBeTruthy()
  await act(async () => control.click())
}
async function navigate(path) {
  await act(async () => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) })
}
async function startVisit({ throughMore = false } = {}) {
  if (throughMore) window.history.replaceState({}, '', '/home')
  await act(async () => root.render(<App />))
  if (throughMore) await click('Let’s Eat')
  await click('Noodle'); await click('Continue'); await click('Spicy'); await click('Comforting'); await click('Continue')
  await click('Feeling AdventurousTake me further outside my comfort zone'); await click('Continue')
  await click('Southeast AsiaVietnam • Cambodia • Philippines'); await click('Continue')
  if (throughMore) { await click('See more options'); await click('View Num Banh Chok details'); await click('Save Num Banh Chok to favorites') }
  else await click('View Lort Cha details')
  await click('Find nearby restaurants'); await click('View THMOR DA Restaurant details')
  expect(document.querySelector('h1').textContent).toBe('THMOR DA Restaurant')
  if (throughMore) await click('Save THMOR DA Restaurant to favorites')
  await click('I ate here')
}
const routeVisitId = () => window.location.pathname.split('/')[2]
async function finishFeedback() {
  expect(document.querySelector('h1').textContent).toBe('How was your meal?')
  expect([...document.querySelectorAll('button')].find(button => button.textContent === 'Continue').disabled).toBe(true)
  await click('Loved it!'); await click('Savory'); await click('Continue')
  expect(document.querySelector('h1').textContent).toBe('Experience Logged!')
}

describe('Sections 03–06 connected experience', () => {
  it('completes Home → More Options → Num Banh Chok → collection → Home, restoring progress/favorites after refresh', async () => {
    await startVisit({ throughMore: true })
    expect(document.body.textContent).toContain('Ready to log Num Banh Chok')
    const visitId = routeVisitId()
    await click('Continue'); await finishFeedback()
    await click('You have unlocked your Mystery Box!Tap to discover your reward.')
    vi.useFakeTimers(); await click('Open Mystery Box'); await act(async () => vi.advanceTimersByTime(1750)); vi.useRealTimers()
    await click('View Collection'); await click('View Ziggy'); await click('Add to favorites')
    // Reload the application at its current URL with the same local storage.
    await act(async () => root.unmount())
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(<App />))
    expect(document.querySelector('h1').textContent).toBe('ZIGGY')
    expect([...document.querySelectorAll('button')].some(button => button.textContent === 'Remove from favorites')).toBe(true)
    await click('Go back'); await click('Go back'); await click('Go back')
    expect(window.location.pathname).toBe('/home')
    expect(document.body.textContent).toContain('Lifetime total: 18 meals')
    await click('Let’s Eat'); await click('Continue'); await click('Continue'); await click('Continue'); await click('Continue')
    await click('See more options'); await click('View Num Banh Chok details')
    expect(document.querySelector('[aria-label="Remove Num Banh Chok from favorites"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Refresh nearby restaurants')
    await click('View THMOR DA Restaurant details')
    expect(document.querySelector('[aria-label="Remove THMOR DA Restaurant from favorites"]')).toBeTruthy()
    await click('I ate here'); await click('Continue')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('This visit was already counted')
    await click('View other dishes from this restaurant')
    await click('View Lort Cha details'); await click('Find nearby restaurants'); expect(document.body.textContent).toContain('Refresh nearby restaurants')
    await click('View THMOR DA Restaurant details'); await click('I ate here'); await click('Continue')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await finishFeedback()
    expect(document.body.textContent).toContain('Lifetime total: 19 meals')
    expect(document.body.textContent).toContain('2 more experiences until your Mystery Box')
    expect(document.querySelector('.logged-unlocked')).toBeNull()
    expect(JSON.parse(localStorage.getItem('nom.v2.guest.experience')).data.logs.map(log => log.dishId)).toEqual(['num-banh-chok', 'lort-cha'])
    expect(localStorage.getItem('nom.v2.guest.experience')).not.toContain('returnState')
    expect(visitId).toBeTruthy()
  })
  it('logs the selected dish, earns and opens a box, updates collections, and retains favorite/reward state on navigation', async () => {
    await startVisit()
    expect(document.body.textContent).toContain('No GPS or visit time is being measured')
    expect(document.body.textContent).toContain('Ready to log Lort Cha')
    const visitId = routeVisitId()
    await click('Continue'); await finishFeedback()
    expect(document.body.textContent).toContain('You enjoyed Lort Cha atTHMOR DA Restaurant')
    expect(document.body.textContent).toContain('Lifetime total: 18 meals')
    await click('You have unlocked your Mystery Box!Tap to discover your reward.')
    expect(window.location.pathname).toBe(`/boxes/box-${visitId}`)
    vi.useFakeTimers()
    await click('Open Mystery Box')
    expect(window.location.pathname).toBe(`/boxes/box-${visitId}/opening`)
    await act(async () => vi.advanceTimersByTime(1750))
    vi.useRealTimers()
    expect(document.querySelector('h2').textContent).toBe('ZIGGY')
    await click('View Collection')
    expect(document.body.textContent).toContain('6 OF 6 COLLECTIBLES COLLECTED')
    await click('View Ziggy')
    expect(document.querySelector('h1').textContent).toBe('ZIGGY')
    await click('Add to favorites'); await click('Go back'); await click('Go back')
    await click('Completed')
    expect(document.querySelectorAll('.collection-country')).toHaveLength(1)
    await click('Favorites')
    expect(document.querySelectorAll('.collection-country')).toHaveLength(1)
    await navigate(`/visits/${visitId}/feedback`)
    expect(window.location.pathname).toBe(`/visits/${visitId}/logged`)
    expect(document.body.textContent).toContain('Lifetime total: 18 meals')
    await click('Back to Home')
    expect(document.body.textContent).toContain('Lifetime total: 18 meals')
    expect(document.querySelector('a[href="/collections/cambodia"]')).toBeTruthy()
  })

  it('logs an unverified meal without box progress and supports modal Escape/focus', async () => {
    await startVisit(); await click('Couldn’t verify automatically?')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('We couldn’t verify your visit automatically')
    expect(document.activeElement.getAttribute('role')).toBe('dialog')
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement.textContent).toContain('Couldn’t verify automatically?')
    await click('Couldn’t verify automatically?'); await click('Log without verificationSave to history without adding progress')
    expect(document.body.textContent).toContain('Unverified — no box progress')
    await finishFeedback()
    expect(document.body.textContent).toContain('No extra box progress')
    expect(document.body.textContent).toContain('1 more experience until your Mystery Box')
    expect(document.querySelector('.logged-unlocked')).toBeNull()
  })

  it('simulates a QR verification, shows the feedback explanation, and handles a same-day repeat', async () => {
    await startVisit(); await click('Couldn’t verify automatically?'); await click('Scan restaurant QRSimulate a partnered restaurant QR')
    await click('Why we ask for feedback')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('It doesn’t change your current matches')
    await click('I got it'); await finishFeedback()
    await navigate('/recommendations/lort-cha/nearby/preview-golden-monkey'); await click('I ate here'); await click('Continue')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('This visit was already counted')
    await click('Log anyway'); await finishFeedback()
    expect(document.body.textContent).toContain('No extra box progress')
    expect(document.body.textContent).toContain('Lifetime total: 19 meals')
  })

  it.each([
    ['/visits/missing/verify', 'Visit not found'], ['/visits/missing/feedback', 'Visit not found'],
    ['/visits/missing/logged', 'Experience not found'], ['/boxes/missing', 'Mystery Box not found'],
    ['/boxes/missing/reveal', 'Mystery Box not found'], ['/collections/unknown', 'Collection not found'],
    ['/collections/cambodia/unknown', 'Collectible not found'], ['/collections/cambodia/ziggy', 'Collectible locked'],
  ])('defends an invalid or unavailable session route %s', async (path, title) => {
    window.history.replaceState({}, '', path)
    await act(async () => root.render(<App />))
    expect(document.querySelector('h1').textContent).toBe(title)
  })

  it('shows the exact Lumi detail artwork and seeded metadata, with working collection filters', async () => {
    window.history.replaceState({}, '', '/collections/cambodia/lumi')
    await act(async () => root.render(<App />))
    expect(document.querySelector('h1').textContent).toBe('LUMI')
    expect(document.body.textContent).toContain('Sep 27, 2026')
    expect(document.querySelectorAll('.collectible-inspiration article')).toHaveLength(4)
    await click('Go back'); await click('Locked collectible')
    expect(document.querySelector('[role="dialog"]').textContent).toContain('How Mystery Box Progress Works')
    await click('I got it'); await click('Go back'); await click('Favorites')
    expect(document.body.textContent).toContain('Favorite a collectible')
    await click('All')
    expect(document.querySelectorAll('.collection-country')).toHaveLength(8)
  })
})
