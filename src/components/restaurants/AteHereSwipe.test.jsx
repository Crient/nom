// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AteHereSwipe from './AteHereSwipe'

let root, confirm, handle, track
beforeEach(async () => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'
  confirm = vi.fn(); root = createRoot(document.getElementById('root'))
  await act(() => root.render(<AteHereSwipe onConfirm={confirm} />))
  handle = document.querySelector('.restaurant-ate-handle'); track = document.querySelector('.restaurant-ate-swipe')
  Object.defineProperty(track, 'clientWidth', { value: 300 }); Object.defineProperty(handle, 'offsetWidth', { value: 68 })
})
afterEach(async () => { await act(() => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function pointer(type, x, id = 1) {
  await act(() => handle.dispatchEvent(new PointerEvent(type, { clientX: x, pointerId: id, button: 0, isPrimary: true, bubbles: true })))
}
async function key(key, repeat = false) { await act(() => handle.dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true }))) }
describe('playful Nom meal confirmation', () => {
  it.each([0, .25, .5, .75, 1])('carries the radial gold focal point with the mascot at %s progress', async fraction => {
    await pointer('pointerdown', 10); await pointer('pointermove', 10 + 216 * fraction)
    const warmth = document.querySelector('.restaurant-ate-warmth')
    expect(warmth.style.transform).toBe(handle.style.transform)
    expect(warmth.style.transform).toBe(`translateX(${216 * fraction}px)`)
    expect(Number.parseFloat(track.style.getPropertyValue('--ate-center'))).toBe(42)
    expect(42 + 216 * fraction).toBe(8 + 68 / 2 + 216 * fraction)
    await pointer('pointercancel', 10 + 216 * fraction)
    expect(warmth.style.transform).toBe(handle.style.transform)
    expect(warmth.style.transform).toBe('translateX(0px)')
    expect(confirm).not.toHaveBeenCalled()
  })
  it('animates the mounted jaws only during a moving drag, and restores rest on release/cancel', async () => {
    const mascot = document.querySelector('.restaurant-ate-mascot'), rest = mascot.querySelector('.restaurant-ate-rest'), jaws = [...mascot.querySelectorAll('.restaurant-ate-jaw')]
    expect(mascot.dataset.eating).toBe('false'); expect(jaws).toHaveLength(2)
    await pointer('pointerdown', 10); expect(mascot.dataset.eating).toBe('false')
    await pointer('pointermove', 90); expect(mascot.dataset.eating).toBe('true')
    expect(mascot.querySelector('.restaurant-ate-rest')).toBe(rest)
    expect([...mascot.querySelectorAll('.restaurant-ate-jaw')]).toEqual(jaws)
    expect(handle.style.transform).toBe(document.querySelector('.restaurant-ate-warmth').style.transform)
    await pointer('pointerup', 90); expect(mascot.dataset.eating).toBe('false')
    expect(handle.style.transform).toBe('translateX(0px)')
    await pointer('pointerdown', 10); await pointer('pointermove', 90)
    expect(mascot.dataset.eating).toBe('true'); await pointer('pointercancel', 90)
    expect(mascot.dataset.eating).toBe('false'); expect(confirm).not.toHaveBeenCalled()
    await pointer('pointerdown', 10); await pointer('pointerup', 210)
    expect(mascot.dataset.eating).toBe('false')
    await act(() => vi.advanceTimersByTimeAsync(450)); expect(confirm).toHaveBeenCalledTimes(1)
  })
  it('keeps the resting mouth during a drag with reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<AteHereSwipe onConfirm={confirm} />))
    handle = document.querySelector('.restaurant-ate-handle'); track = document.querySelector('.restaurant-ate-swipe')
    Object.defineProperty(track, 'clientWidth', { value: 300 }); Object.defineProperty(handle, 'offsetWidth', { value: 68 })
    await pointer('pointerdown', 10); await pointer('pointermove', 90)
    expect(track.classList.contains('is-dragging')).toBe(true)
    expect(document.querySelector('.restaurant-ate-mascot').dataset.eating).toBe('false')
    expect(document.querySelector('.restaurant-ate-crumbs')).toBeNull()
    await pointer('pointercancel', 90); expect(confirm).not.toHaveBeenCalled()
  })
  it('consumes only the passed letters at halfway and restores the whole phrase on cancellation', async () => {
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ left: 20, width: 300 })
    const phrase = document.querySelector('.restaurant-ate-phrase')
    vi.spyOn(phrase, 'getBoundingClientRect').mockReturnValue({ left: 152, width: 112 })
    await pointer('pointerdown', 10); await pointer('pointermove', 118)
    expect(handle.style.transform).toBe('translateX(108px)')
    const eaten = parseFloat(track.style.getPropertyValue('--ate-eaten'))
    expect(eaten).toBeCloseTo(31.6); expect(eaten).toBeLessThan(112)
    expect(phrase.style.clipPath).toContain(`${eaten}px`)
    expect(phrase.textContent).toBe('I ate here')
    expect(track.style.getPropertyValue('--ate-label-opacity')).toBe('')
    await pointer('pointerup', 118)
    expect(phrase.style.clipPath).toBe('inset(0 0 0 0px)')
    expect(track.style.getPropertyValue('--ate-fill')).toBe('0px')
  })
  it.each([[.849, false], [.85, true]])('requires the release boundary %s for completion', async (fraction, completes) => {
    await pointer('pointerdown', 10); await pointer('pointerup', 10 + 216 * fraction)
    await act(() => vi.advanceTimersByTimeAsync(450))
    expect(confirm).toHaveBeenCalledTimes(completes ? 1 : 0)
  })
  it('offers visible deliberate button confirmation without dragging', async () => {
    await act(() => document.querySelector('.restaurant-ate-alternative').click())
    expect(confirm).not.toHaveBeenCalled()
    expect(document.querySelector('.restaurant-ate-alternative').textContent).toBe('Confirm I ate here')
    await act(() => document.querySelector('.restaurant-ate-alternative').click())
    await act(() => vi.advanceTimersByTimeAsync(450)); expect(confirm).toHaveBeenCalledTimes(1)
  })
  it('requires 85% travel and confirms exactly once after the celebration', async () => {
    await pointer('pointerdown', 10); await pointer('pointermove', 200); await pointer('pointerup', 200)
    expect(track.textContent).toContain('I ate here!'); expect(confirm).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(450)); expect(confirm).toHaveBeenCalledTimes(1)
    await key('Enter'); await act(() => vi.advanceTimersByTimeAsync(1000)); expect(confirm).toHaveBeenCalledTimes(1)
  })
  it('returns the character to the start below threshold and on cancellation', async () => {
    await pointer('pointerdown', 10); await pointer('pointermove', 100); expect(parseFloat(track.style.getPropertyValue('--ate-progress'))).toBeGreaterThan(0); await pointer('pointerup', 100)
    expect(track.style.getPropertyValue('--ate-progress')).toBe('0%'); expect(confirm).not.toHaveBeenCalled()
    await pointer('pointerdown', 10); await pointer('pointermove', 210); await pointer('pointercancel', 210)
    await act(() => vi.advanceTimersByTimeAsync(1000)); expect(confirm).not.toHaveBeenCalled()
  })
  it('ignores an unrelated pointer and a simple tap', async () => {
    await pointer('pointerdown', 10); await pointer('pointermove', 300, 2); await pointer('pointerup', 10)
    await act(() => handle.click()); await act(() => vi.advanceTimersByTimeAsync(1000)); expect(confirm).not.toHaveBeenCalled()
  })
  it('provides deliberate keyboard confirmation, escape cancellation and repeat protection', async () => {
    await key('Enter'); expect(track.textContent).toContain('Press again to confirm')
    await key('Enter', true); expect(confirm).not.toHaveBeenCalled()
    await key('Escape'); expect(track.textContent).toContain('Swipe to confirm')
    await key(' '); await key(' '); await act(() => vi.advanceTimersByTimeAsync(450)); expect(confirm).toHaveBeenCalledTimes(1)
  })
  it('respects reduced motion and clears unfinished navigation on unmount', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<AteHereSwipe onConfirm={confirm} />)); handle = document.querySelector('.restaurant-ate-handle')
    expect(document.querySelector('.restaurant-ate-swipe').dataset.reducedMotion).toBe('true')
    await key('Enter'); await key('Enter'); await act(() => vi.advanceTimersByTimeAsync(100)); expect(confirm).toHaveBeenCalledTimes(1)
    confirm.mockClear(); await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<AteHereSwipe onConfirm={confirm} />)); handle = document.querySelector('.restaurant-ate-handle')
    await key('Enter'); await key('Enter'); await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => vi.advanceTimersByTimeAsync(500)); expect(confirm).not.toHaveBeenCalled()
  })
})
