// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ActivityCard from './ActivityCard'
import { dishes } from '../../data/dishes'
let root, style
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById('root'))
  style = document.createElement('style'); style.textContent = readFileSync('src/styles/hubs.css', 'utf8'); document.head.append(style)
})
afterEach(async () => { await act(() => root.unmount()); style.remove() })
describe('Recently Explored compact geometry and existing destinations', () => {
  it('keeps consistent cards and images while titles flow naturally into nearby metadata', async () => {
    const entries = ['Dish explored', 'Meal logged · Verified', 'Meal logged · Unverified'].map((label, i) => ({ id: String(i), dish: dishes[i], label,
      date: '2026-10-07T12:00:00Z', to: i === 0 ? `/recommendations/${dishes[i].id}` : `/visits/${i}/logged` }))
    await act(() => root.render(<MemoryRouter>{entries.map(entry => <ActivityCard key={entry.id} entry={entry} returnTo="/home" compact />)}</MemoryRouter>))
    const cards = [...document.querySelectorAll('.activity-card')]
    const geometry = cards.map(card => ({ height: getComputedStyle(card).height, padding: getComputedStyle(card).padding,
      imageHeight: getComputedStyle(card.querySelector('img')).height,
      imageAlignment: getComputedStyle(card.querySelector('img')).alignSelf, metadataLine: getComputedStyle(card.querySelector('small')).lineHeight,
      dateLine: getComputedStyle(card.querySelector('time')).lineHeight }))
    expect(geometry[0]).toEqual({ height: '112px', padding: '12px', imageHeight: '64px', imageAlignment: 'center', metadataLine: '16px', dateLine: '16px' })
    expect(geometry.every(item => JSON.stringify(item) === JSON.stringify(geometry[0]))).toBe(true)
    cards.forEach((card, i) => { expect(card.getAttribute('href')).toBe(entries[i].to); expect(card.textContent).toContain(entries[i].label) })
    expect(readFileSync('src/styles/hubs.css', 'utf8')).toContain('flex: 0 0 min(78cqw,290px)')
    cards.forEach(card => {
      const title = getComputedStyle(card.querySelector('strong'))
      expect(['', 'auto']).toContain(title.height)
      expect(title.overflow).toBe('hidden')
      expect(getComputedStyle(card.querySelector(':scope > span')).gap).toBe('4px')
    })
    // happy-dom doesn't compute the vendor-prefixed line-clamp properties.
    const titleRule = readFileSync('src/styles/hubs.css', 'utf8').match(/\.activity-card-compact strong\s*\{([^}]+)\}/)[1]
    expect(titleRule).toMatch(/-webkit-line-clamp:\s*2/)
    expect(titleRule).toMatch(/-webkit-box-orient:\s*vertical/)
  })
  it('keeps History cards outside the compact Home geometry', async () => {
    await act(() => root.render(<MemoryRouter><ActivityCard entry={{ dish: dishes[0], date: '2026-10-07', label: 'Dish explored', to: '/recommendations/lort-cha' }} /></MemoryRouter>))
    expect(document.querySelector('.activity-card').className).not.toContain('activity-card-compact')
    expect(getComputedStyle(document.querySelector('img')).height).toBe('68px')
  })
})
