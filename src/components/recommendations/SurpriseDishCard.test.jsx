// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SurpriseDishCard, { SURPRISE_EXIT_MS } from './SurpriseDishCard'
import { dishes } from '../../data/dishes'
import { createSurpriseSession, surpriseCandidates } from '../../utils/surpriseSession'
import { recommend } from '../../utils/recommendationEngine'

let root, card, skip, select
beforeEach(async () => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  skip = vi.fn(); select = vi.fn(); root = createRoot(document.getElementById('root'))
  await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} onSkip={skip} onSelect={select} />))
  card = document.querySelector('.surprise-dish-card')
  Object.defineProperty(card, 'clientWidth', { value: 320 })
})
afterEach(async () => { await act(() => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function pointer(type, x, y = 10, id = 1) {
  await act(() => card.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, button: 0, isPrimary: true, bubbles: true })))
}
async function finish() { await act(() => vi.advanceTimersByTimeAsync(SURPRISE_EXIT_MS)) }
describe('Surprise Me gestures and accessible controls', () => {
  it.each([2, 3, 12])('keeps all upcoming DOM occurrences stable through 12 left swipes and Undo with %s candidates', async size => {
    const session = { foodType: 'anything', flavors: ['comforting'], adventurousness: 'surprise-me', region: 'surprise-me' }
    const pool = surpriseCandidates(session, recommend(session, dishes)).slice(0, size), queue = createSurpriseSession()
    const errors = vi.spyOn(console, 'error')
    function Deck() {
      const [current, setCurrent] = useState(() => queue.next(session, pool)), [draw, setDraw] = useState(0)
      const next = queue.peek(session, pool), queued = queue.peek(session, pool, 1), buffered = queue.peek(session, pool, 2)
      return <SurpriseDishCard identity={`${draw}:${current.dish.id}`} result={current} nextResult={next} queuedResult={queued} bufferedResult={buffered}
        canUndo={queue.canGoBack(session)} onUndo={() => { setCurrent(queue.previous(session, pool)); setDraw(value => value + 1) }}
        onSkip={() => { setCurrent(queue.next(session, pool)); setDraw(value => value + 1) }} onSelect={select} />
    }
    await act(() => root.render(<Deck />))
    const names = []
    for (let index = 0; index < 12; index++) {
      card = document.querySelector('.surprise-dish-card')
      Object.defineProperty(card, 'clientWidth', { value: 320 })
      const rear = document.querySelector('.surprise-next-card'), queued = document.querySelector('.surprise-queued-card'), buffered = document.querySelector('.surprise-buffered-card')
      const image = rear.querySelector('img'), queuedImage = queued.querySelector('img'), bufferedImage = buffered.querySelector('img')
      const imageWrites = [image, queuedImage, bufferedImage].map(node => vi.spyOn(node, 'setAttribute'))
      names.push(card.getAttribute('aria-label'))
      expect(new Set([...document.querySelectorAll('[data-deck-key]')].map(node => node.dataset.deckKey)).size).toBe(4)
      expect(buffered.style.opacity).toBe('0')
      await pointer('pointerdown', 200); await pointer('pointerup', 60)
      const frontPose = rear.style.transform, rearPose = queued.style.transform, queuedPose = buffered.style.transform
      await finish()
      expect(document.querySelector('.surprise-dish-card')).toBe(rear); expect(rear.querySelector('img')).toBe(image)
      expect(document.querySelector('.surprise-next-card')).toBe(queued); expect(queued.querySelector('img')).toBe(queuedImage)
      expect(document.querySelector('.surprise-queued-card')).toBe(buffered); expect(buffered.querySelector('img')).toBe(bufferedImage)
      expect(rear.style.transform).toBe(frontPose); expect(queued.style.transform).toBe(rearPose); expect(buffered.style.transform).toBe(queuedPose)
      for (const writes of imageWrites) {
        expect(writes.mock.calls.filter(([attribute]) => attribute === 'src')).toHaveLength(0)
        writes.mockRestore()
      }
    }
    const skipButton = document.querySelector('.surprise-controls button')
    await act(() => [...document.querySelectorAll('button')].find(node => node.textContent.includes('Undo skip')).click())
    expect(document.querySelector('.surprise-dish-card').getAttribute('aria-label')).toBe(names.at(-1))
    await act(() => skipButton.focus()); await act(() => skipButton.click()); await finish()
    expect(document.activeElement).toBe(skipButton)
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/render|key|update/i)
  })
  it('advances the existing rear image continuously and keeps it mounted on promotion', async () => {
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} nextResult={{ dish: dishes[1] }} onSkip={skip} onSelect={select} />))
    const stack = document.querySelector('.surprise-card-stack'), rear = document.querySelector('.surprise-next-card')
    expect(rear.querySelector('img').getAttribute('src')).toBe(dishes[1].image)
    expect(rear.textContent).not.toContain('Up next')
    const image = rear.querySelector('img'), resting = rear.style.transform
    expect(Math.abs(Number(card.style.transform.match(/rotate\(([-.\d]+)deg\)/)[1]))).toBeLessThanOrEqual(2.5)
    await pointer('pointerdown', 150); await pointer('pointermove', 40)
    expect(rear.style.transform).not.toBe(resting)
    expect(rear.style.transform).toContain('translateY(-')
    await pointer('pointercancel', 40)
    expect(rear.style.transform).toBe(resting)
    await act(() => document.querySelector('.surprise-controls button').click())
    expect(rear.style.transform).toContain('translateY(0px) scale(1)')
    const promotedPose = rear.style.transform
    await finish()
    await act(() => root.render(<SurpriseDishCard identity="next" result={{ dish: dishes[1] }} nextResult={{ dish: dishes[2] }} onSkip={skip} onSelect={select} />))
    expect(document.querySelector('.surprise-card-stack')).toBe(stack)
    expect(document.querySelector('.surprise-dish-card')).toBe(rear)
    expect(document.querySelector('.surprise-dish-card img')).toBe(image)
    expect(rear.style.transform).toBe(promotedPose)
    expect(rear.style.opacity).toBe('1')
  })
  it('offers a native Undo button and ignores undo during an outgoing skip', async () => {
    const undo = vi.fn()
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} onSkip={skip} onSelect={select} onUndo={undo} canUndo />))
    const button = [...document.querySelectorAll('button')].find(element => element.textContent.includes('Undo skip'))
    await act(() => { button.focus(); button.click() })
    expect(undo).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(button)
    await act(() => document.querySelector('.surprise-controls button').click())
    await act(() => button.click()); await finish()
    expect(undo).toHaveBeenCalledTimes(1); expect(skip).toHaveBeenCalledTimes(1)
  })
  it('restores previous content immediately with reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    const undo = vi.fn()
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[1] }} nextResult={{ dish: dishes[2] }} onSkip={skip} onSelect={select} onUndo={undo} canUndo />))
    const button = [...document.querySelectorAll('button')].find(element => element.textContent.includes('Undo skip'))
    await act(() => button.click())
    expect(undo).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.surprise-card-stack').dataset.reducedMotion).toBe('true')
    expect(skip).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
  })
  it('skips on a completed left swipe after the outgoing animation, once only', async () => {
    await pointer('pointerdown', 150); await pointer('pointermove', 40)
    expect(card.style.transform).toContain('translateX(-110px)')
    expect(document.querySelector('.surprise-swipe-skip').style.opacity).toBe('1')
    await pointer('pointerup', 40)
    expect(skip).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
    await act(() => document.querySelector('.surprise-controls button').click()); await finish()
    expect(skip).toHaveBeenCalledTimes(1); expect(select).not.toHaveBeenCalled()
  })
  it('selects on a completed right swipe', async () => {
    await pointer('pointerdown', 10); await pointer('pointerup', 100); await finish()
    expect(select).toHaveBeenCalledTimes(1); expect(skip).not.toHaveBeenCalled()
  })
  it('cancels partial drags, pointer cancellation, taps and unrelated pointers', async () => {
    await pointer('pointerdown', 10); await pointer('pointermove', 70); await pointer('pointerup', 70)
    expect(card.style.transform).toContain('translateX(0px)')
    await pointer('pointerdown', 10); await pointer('pointermove', 210); await pointer('pointercancel', 210)
    await pointer('pointerdown', 10); await pointer('pointermove', 200, 10, 2); await pointer('pointerup', 10)
    await act(() => card.click()); await finish()
    expect(skip).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
  })
  it('allows vertical scrolling without converting it to navigation', async () => {
    await pointer('pointerdown', 10, 10); await pointer('pointermove', 15, 80); await pointer('pointerup', 200, 100); await finish()
    expect(skip).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
  })
  it.each([['Not this one', 'skip'], ['Try this', 'select']])('provides the %s button without a gesture', async (label, action) => {
    const button = [...document.querySelectorAll('button')].find(element => element.textContent === label)
    await act(() => button.click()); await finish()
    expect(action === 'skip' ? skip : select).toHaveBeenCalledTimes(1)
  })
  it('removes tilt and exits immediately with reduced motion, and cancels timers on unmount', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} onSkip={skip} onSelect={select} />))
    card = document.querySelector('.surprise-dish-card')
    expect(card.dataset.reducedMotion).toBe('true')
    await act(() => document.querySelector('.surprise-controls button').click())
    await act(() => vi.advanceTimersByTimeAsync(0)); expect(skip).toHaveBeenCalledTimes(1)
    select.mockClear()
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} onSkip={skip} onSelect={select} />))
    await act(() => document.querySelectorAll('.surprise-controls button')[1].click())
    await act(() => root.unmount()); root = createRoot(document.getElementById('root'))
    await finish(); expect(select).not.toHaveBeenCalled()
  })
})
