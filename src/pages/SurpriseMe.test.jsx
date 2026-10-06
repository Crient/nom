// @vitest-environment happy-dom
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { actAndLoadRoutes as act } from '../test/routeAct'
import { STORAGE_KEYS, writeLocalState } from '../data/localPersistence'
import { surpriseSession } from '../utils/surpriseSession'
import { installMockNearbyProvider } from '../test/mockNearbyProvider'

let root
beforeEach(() => {
  installMockNearbyProvider(); surpriseSession.reset(); vi.useFakeTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  writeLocalState(STORAGE_KEYS.discovery, { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' })
  root = createRoot(document.getElementById('root'))
})
afterEach(async () => { await act(() => root.unmount()); surpriseSession.reset(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function navigate(path) {
  await act(() => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) })
}
async function click(label) {
  const button = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === label)
  expect(button).toBeTruthy(); await act(() => button.click())
  await act(() => vi.advanceTimersByTimeAsync(240))
}
const shown = () => document.querySelector('.surprise-dish-card')?.getAttribute('aria-label')
describe('Surprise Me recommendation flow', () => {
  it('renders the actual upcoming dish in the rear card and promotes it after skip', async () => {
    window.history.replaceState({}, '', '/recommendations/surprise')
    await act(() => root.render(<App />))
    const nextName = document.querySelector('.surprise-next-card h2').textContent
    const nextImage = document.querySelector('.surprise-next-card img').getAttribute('src')
    expect(nextImage).toContain('.webp')
    expect(document.querySelector('.surprise-next-card').getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelector('.surprise-next-label')).toBeNull()
    await click('Not this one')
    expect(document.querySelector('.surprise-dish-card h2').textContent).toBe(nextName)
    expect(document.querySelector('.surprise-dish-card img').getAttribute('src')).toBe(nextImage)
  })
  it('undoes an accidental skip, restores the upcoming card and preserves focus', async () => {
    window.history.replaceState({}, '', '/recommendations/surprise')
    await act(() => root.render(<App />))
    const first = shown(), firstImage = document.querySelector('.surprise-dish-card img').getAttribute('src')
    const undo = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Undo skip'))
    expect(undo.disabled).toBe(true)
    await click('Not this one'); const second = shown()
    expect(undo.disabled).toBe(false)
    await act(() => undo.focus()); await click('↶ Undo skip')
    expect(shown()).toBe(first)
    expect(document.querySelector('.surprise-dish-card img').getAttribute('src')).toBe(firstImage)
    expect(document.querySelector('.surprise-next-card h2').textContent).toContain(second)
    await click('Not this one')
    expect(shown()).toBe(second)
  })
  it('retains keyboard focus across repeated skips while replacing only the visual card', async () => {
    window.history.replaceState({}, '', '/recommendations/surprise')
    await act(() => root.render(<App />))
    const skip = document.querySelector('.surprise-controls button')
    await act(() => skip.focus())
    for (let index = 0; index < 3; index++) {
      const before = shown()
      await click('Not this one')
      expect(document.activeElement).toBe(skip)
      expect(skip.getAttribute('aria-disabled')).toBe('false')
      expect(shown()).not.toBe(before)
    }
  })
  it('promotes the same rear card and image node through ten consecutive completed swipes without moving the queued nodes', async () => {
    window.history.replaceState({}, '', '/recommendations/surprise')
    await act(() => root.render(<App />))
    for (let index = 0; index < 10; index++) {
      const front = document.querySelector('.surprise-dish-card'), rear = document.querySelector('.surprise-next-card'), image = rear.querySelector('img')
      const source = image.getAttribute('src'), queued = document.querySelector('.surprise-queued-card')
      const records = [], observer = new MutationObserver(changes => records.push(...changes))
      observer.observe(document.querySelector('.surprise-card-stack'), { childList: true })
      expect(new Set([...document.querySelectorAll('[data-deck-key]')].map(node => node.dataset.deckKey)).size).toBe(4)
      Object.defineProperty(front, 'clientWidth', { value: 320 })
      await act(() => front.dispatchEvent(new PointerEvent('pointerdown', { clientX: 200, clientY: 20, pointerId: index + 1, button: 0, isPrimary: true, bubbles: true })))
      await act(() => front.dispatchEvent(new PointerEvent('pointerup', { clientX: 60, clientY: 20, pointerId: index + 1, button: 0, isPrimary: true, bubbles: true })))
      expect(rear.style.transform).toContain('translateY(0px) scale(1)')
      const promotedPose = rear.style.transform, queuedPose = queued.style.transform
      await act(() => vi.advanceTimersByTimeAsync(240))
      expect(document.querySelector('.surprise-dish-card'), `step ${index}, old rear key ${rear.dataset.deckKey}, new front key ${document.querySelector('.surprise-dish-card').dataset.deckKey}`).toBe(rear)
      expect(rear.querySelector('img')).toBe(image)
      expect(image.getAttribute('src')).toBe(source)
      expect(rear.style.opacity).toBe('1')
      expect(rear.style.transform).toBe(promotedPose)
      expect(document.querySelector('.surprise-next-card')).toBe(queued)
      expect(queued.style.transform).toBe(queuedPose)
      records.push(...observer.takeRecords()); observer.disconnect()
      expect(records.flatMap(record => [...record.removedNodes])).not.toContain(rear)
      expect(records.flatMap(record => [...record.removedNodes])).not.toContain(queued)
    }
  })
  it('keeps constraints, skips, opens the selected canonical dish and varies across launches', async () => {
    window.history.replaceState({}, '', '/recommendations')
    await act(() => root.render(<App />))
    const normal = [...document.querySelectorAll('article')].map(node => node.getAttribute('aria-label'))
    await click('Surprise me'); const first = shown()
    await click('Not this one'); const second = shown(); expect(second).not.toBe(first)
    await click('Try this')
    expect(document.querySelector('h1').textContent).toContain(second)
    expect(window.location.pathname).toMatch(/^\/recommendations\/[a-z-]+$/)
    await navigate('/recommendations/surprise'); expect(shown()).not.toBe(second)
    await navigate('/recommendations')
    expect([...document.querySelectorAll('article')].map(node => node.getAttribute('aria-label'))).toEqual(normal)
  })
})
