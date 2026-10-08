// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowHeader } from './experience/FlowLayout'
import HeartButton from './recommendations/HeartButton'
import FilterChip from './ui/FilterChip'
import SurpriseDishCard from './recommendations/SurpriseDishCard'
import { dishes } from '../data/dishes'

let root, style
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  style = document.createElement('style')
  style.textContent = ['experience', 'chrome', 'global', 'hubs', 'surprise'].map(name => readFileSync(`src/styles/${name}.css`, 'utf8')).join('\n')
  document.head.append(style)
})
afterEach(async () => { await act(() => root.unmount()); style.remove() })
describe('surgical UI geometry contracts (DOM, not pixel screenshots)', () => {
  it('centers the heart in the same 44px header targets with equal edge insets', async () => {
    await act(() => root.render(<FlowHeader onBack={() => {}} onInfo={() => {}}><HeartButton dishName="Dish" className="flow-header-favorite right-[49px]" /></FlowHeader>))
    const [back, heart, more] = ['.flow-back', '.flow-header-favorite', '.flow-more'].map(selector => getComputedStyle(document.querySelector(selector)))
    expect(back.top).toBe(heart.top); expect(heart.top).toBe(more.top)
    expect(back.width).toBe('44px'); expect(more.height).toBe('44px')
    expect(back.left).toBe(more.right); expect(heart.right).toBe('62px')
    expect(heart.placeItems).toBe('center')
    expect(getComputedStyle(document.querySelector('.nom-heart svg')).position).toBe('static')
  })
  it.each([360, 375, 390, 430, 440])('keeps wrapping chips and the SDK viewport bounded at %ipx', async width => {
    await act(() => root.render(<div style={{ width }}><div className="visit-map"><div className="visit-map-frame"><div className="visit-map-canvas" /></div></div><div className="hub-filters">{['All', 'Noodles', 'Rice', 'Soup/Broth', 'Grilled/Protein', 'Handheld'].map(label => <FilterChip solid key={label} selected={label === 'All'}>{label}</FilterChip>)}</div></div>))
    const frame = getComputedStyle(document.querySelector('.visit-map-frame')), canvas = getComputedStyle(document.querySelector('.visit-map-canvas'))
    expect(frame.borderRadius).toBe('16px'); expect(frame.overflow).toBe('hidden')
    expect(canvas.maskImage).toBe(''); expect(canvas.width).toBe('100%')
    const filters = getComputedStyle(document.querySelector('.hub-filters')), chip = getComputedStyle(document.querySelector('.nom-filter-chip > span'))
    expect(filters.flexWrap).toBe('wrap'); expect(filters.gap).toBe('8px 10px')
    expect(chip.paddingLeft).toBe('12px'); expect(chip.minHeight).toBe('30px')
    expect(document.querySelector('.nom-filter-chip').getAttribute('aria-pressed')).toBe('true')
    // The fixed map maximum and the largest chip label fit the narrowest content width.
    expect(Math.min(251, width - 52)).toBeLessThan(width)
  })
  it.each([[-40, 'skip', 'right'], [40, 'try', 'left']])('puts feedback on the trailing edge for a %ipx drag', async (offset, kind, side) => {
    const skip = vi.fn(), select = vi.fn()
    await act(() => root.render(<SurpriseDishCard result={{ dish: dishes[0] }} nextResult={{ dish: dishes[1] }} onSkip={skip} onSelect={select} />))
    const card = document.querySelector('.surprise-dish-card')
    Object.defineProperty(card, 'clientWidth', { value: 320 })
    for (const [type, x] of [['pointerdown', 150], ['pointermove', 150 + offset]]) {
      await act(() => card.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: 20, pointerId: 1, button: 0, isPrimary: true, bubbles: true })))
    }
    const cue = card.querySelector(`.surprise-swipe-${kind}`)
    expect(getComputedStyle(cue)[side]).toBe('16px'); expect(Number(cue.style.opacity)).toBe(.5)
    expect(getComputedStyle(document.querySelector('.surprise-card-stack')).overflow).not.toBe('hidden')
    expect(getComputedStyle(card).zIndex).toBe('2')
    expect(skip).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
  })
})
