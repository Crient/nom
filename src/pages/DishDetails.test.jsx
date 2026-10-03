import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useDiscoverySession } from '../context/DiscoverySession'
import { FavoritesProvider } from '../context/Favorites'
import { dishes } from '../data/dishes'
import { recommend } from '../utils/recommendationEngine'
import DishDetails from './DishDetails'

vi.mock('../context/DiscoverySession', () => ({ useDiscoverySession: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal(),
  Navigate: ({ to, replace }) => <span data-redirect={to} data-replace={replace} />,
}))

const PAINTED_SESSION = {
  foodType: 'noodle',
  flavors: ['spicy', 'comforting'],
  adventurousness: 'adventurous',
  region: 'southeast-asia',
}

function renderScreen(id) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/recommendations/${id}`]}>
      <FavoritesProvider>
        <Routes>
          <Route path="/recommendations/:dishId" element={<DishDetails />} />
        </Routes>
      </FavoritesProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => useDiscoverySession.mockReturnValue(PAINTED_SESSION))

describe('Dish Details', () => {
  it.each(dishes)('resolves $id to its own catalog image, description, and live score', (dish) => {
    const result = recommend(PAINTED_SESSION, dishes).find((item) => item.dish.id === dish.id)
    const html = renderScreen(dish.id)
    expect(html).toContain(`alt="${dish.name}"`)
    expect(html).toContain(`src="${dish.image}"`)
    expect(html).toContain(`${Math.round(result.score)}% match`)
    // React escapes apostrophes in text content.
    expect(html).toContain(dish.description.replaceAll("'", '&#x27;'))
    if (dish.id !== 'lort-cha') {
      expect(html).not.toContain('THMOR DA Restaurant')
      expect(html).not.toContain('Lort Cha')
    }
  })

  it('redirects an unknown dish to recommendations', () => {
    const html = renderScreen('unknown-dish')
    expect(html).toContain('data-redirect="/recommendations" data-replace="true"')
    expect(html).not.toContain('Why this matched')
  })

  it.each([{ foodType: null }, { flavors: [] }, { adventurousness: null }])(
    'redirects into discovery when required answers are absent: %j', (missing) => {
      useDiscoverySession.mockReturnValue({ ...PAINTED_SESSION, ...missing })
      expect(renderScreen('lort-cha')).toContain('data-redirect="/discover/food-type" data-replace="true"')
    },
  )

  it('accepts skipped region and computes its updated score', () => {
    const session = { ...PAINTED_SESSION, region: null }
    useDiscoverySession.mockReturnValue(session)
    const score = recommend(session, dishes).find((item) => item.dish.id === 'lort-cha').score
    const html = renderScreen('lort-cha')
    expect(html).toContain(`${Math.round(score)}% match`)
    expect(html).not.toContain('Southeast Asian')
    expect(html).not.toContain('data-redirect')
  })

  it('labels the Lort Cha restaurant fixtures and keeps search disabled', () => {
    const html = renderScreen('lort-cha')
    expect(html).toContain('Design preview only. Ratings and distances are examples.')
    expect(html).toContain('THMOR DA Restaurant')
    expect(html).toContain('The Golden Monkey Cafe')
    expect(html).toContain('Peephuptmei Restaurant')
    expect(html).toContain('16 mi')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*title="Nearby restaurant search is not connected yet"/)
  })
})
