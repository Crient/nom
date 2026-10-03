// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RecommendationCard from './RecommendationCard'
import BestMatchCard from './BestMatchCard'
import { dishes } from '../../data/dishes'

describe('real catalog card titles', () => {
  it.each(['cao-lau', 'baasto-iyo-suugo', 'nashville-hot-chicken', 'montreal-smoked-meat-sandwich'])('keeps the complete %s name and final word/flag together with a separate accessible card link', id => {
    const dish = dishes.find(dish => dish.id === id)
    for (const variant of ['list', 'ranked', 'best']) {
      const props = { result: { dish, score: 70, matchedAttributes: { preferenceFlavors: [] } }, rank: 2, onToggleLike: () => {} }
      const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/explore']}>{variant === 'best' ? <BestMatchCard {...props} /> : <RecommendationCard {...props} variant={variant} />}</MemoryRouter>)
      const page = new DOMParser().parseFromString(html, 'text/html')
      expect(page.querySelector('h2').textContent.trim()).toBe(`${dish.name} ${dish.flag}`)
      expect(page.querySelector('h2 .dish-title-ending').textContent).toBe(`${dish.name.split(' ').at(-1)} ${dish.flag}`)
      expect(page.querySelector('h2 [role="img"]').getAttribute('aria-label')).toBe(dish.country)
      expect(page.querySelector('a').getAttribute('href')).toBe(`/recommendations/${id}`)
      expect(page.querySelector('a').contains(page.querySelector('button'))).toBe(false)
    }
  })
})
