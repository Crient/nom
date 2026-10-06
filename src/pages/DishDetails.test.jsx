import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useDiscoverySession } from '../context/DiscoverySession'
import { FavoritesProvider } from '../context/Favorites'
import { ActivityProvider } from '../context/Activity'
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
      <FavoritesProvider><ActivityProvider>
        <Routes>
          <Route path="/recommendations/:dishId" element={<DishDetails />} />
        </Routes>
      </ActivityProvider></FavoritesProvider>
    </MemoryRouter>,
  )
}

const escapeHtml = text => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
})[char])

beforeEach(() => useDiscoverySession.mockReturnValue(PAINTED_SESSION))

describe('Dish Details', () => {
  it.each(dishes)('resolves $id to its own catalog image, description, and live score', (dish) => {
    const result = recommend(PAINTED_SESSION, dishes).find((item) => item.dish.id === dish.id)
    const html = renderScreen(dish.id)
    expect(html).toContain(`alt="${escapeHtml(dish.name)}"`)
    expect(html).toContain(`src="${dish.image}"`)
    expect(html).toContain(`${Math.round(result.score)}% match`)
    expect(html).toContain(escapeHtml(dish.description))
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

  it('shows an intentional nearby-search state without fake restaurant previews', () => {
    const html = renderScreen('lort-cha')
    expect(html).toContain('Finding restaurants near you')
    expect(html.match(/restaurant-preview-live restaurant-skeleton/g)).toHaveLength(3)
    expect(html).not.toContain('THMOR DA Restaurant')
    expect(html).not.toContain('The Golden Monkey Cafe')
    expect(html).not.toContain('Peephuptmei Restaurant')
    expect(html).not.toContain('16 mi')
    expect(html).toContain('Finding restaurants near you')
  })
})
