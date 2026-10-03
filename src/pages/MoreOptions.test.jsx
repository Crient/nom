import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { useDiscoverySession } from '../context/DiscoverySession'
import { FavoritesProvider } from '../context/Favorites'
import { dishes } from '../data/dishes'
import { recommend } from '../utils/recommendationEngine'
import MoreOptions from './MoreOptions'

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

function renderScreen() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FavoritesProvider>
        <MoreOptions />
      </FavoritesProvider>
    </MemoryRouter>,
  )
}

function renderedMatches(html) {
  return [...html.matchAll(/<article aria-label="([^"]+)"/g)].map((match) => match[1])
}

beforeEach(() => useDiscoverySession.mockReturnValue(PAINTED_SESSION))

describe('More Options', () => {
  it('renders only ranks 4–10 in deterministic engine order with actual scores', () => {
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual([
      '#4 Kolo Mee, 77% match',
      '#5 Pancit Bihon, 77% match',
      '#6 Num Banh Chok, 77% match',
      '#7 Mì Quảng, 70% match',
      '#8 Cao Lầu, 70% match',
      '#9 Reshteh Polow, 70% match',
      '#10 Rechta, 70% match',
    ])
    expect(html).not.toContain('Lort Cha')
    expect(html).not.toContain('Mie Goreng')
    expect(html).not.toContain('Pancit Canton')
    expect(renderedMatches(html)).toEqual(recommend(PAINTED_SESSION, dishes).slice(3, 10).map(
      (result, index) => `#${index + 4} ${result.dish.name}, ${Math.round(result.score)}% match`,
    ))
  })

  it('derives both matches and chips from changed discovery answers', () => {
    const session = { ...PAINTED_SESSION, flavors: ['rich'], adventurousness: 'familiar', region: 'east-asia' }
    useDiscoverySession.mockReturnValue(session)
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual(recommend(session, dishes).slice(3, 10).map(
      (result, index) => `#${index + 4} ${result.dish.name}, ${Math.round(result.score)}% match`,
    ))
    expect(html).toContain('Familiar')
    expect(html).toContain('East Asian')
    expect(html).not.toContain('Southeast Asian')
    expect(html).not.toContain('Spicy')
  })

  it('accepts a skipped region and omits its session chip', () => {
    useDiscoverySession.mockReturnValue({ ...PAINTED_SESSION, region: null })
    const html = renderScreen()
    expect(renderedMatches(html)).toHaveLength(7)
    expect(html).not.toContain('Southeast Asian')
    expect(html).not.toContain('data-redirect')
  })

  it.each([
    { foodType: null },
    { flavors: [] },
    { adventurousness: null },
  ])('redirects to discovery when required inputs are missing: %j', (missing) => {
    useDiscoverySession.mockReturnValue({ ...PAINTED_SESSION, ...missing })
    const html = renderScreen()
    expect(html).toContain('data-redirect="/discover/food-type" data-replace="true"')
    expect(renderedMatches(html)).toEqual([])
  })
})
