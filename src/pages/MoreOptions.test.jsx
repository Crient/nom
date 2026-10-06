import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { useDiscoverySession } from '../context/DiscoverySession'
import { FavoritesProvider } from '../context/Favorites'
import { dishes } from '../data/dishes'
import { recommend, selectMoreOptions } from '../utils/recommendationEngine'
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
  it('renders seven additional regional matches in deterministic order with actual scores', () => {
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual([
      '#4 Kolo Mee, 77% match',
      '#5 Pancit Bihon, 77% match',
      '#6 Num Banh Chok, 77% match',
      '#7 Mì Quảng, 70% match',
      '#8 Cao Lầu, 70% match',
      '#9 Char Kway Teow, 62% match',
      '#10 Hokkien Mee, 62% match',
    ])
    expect(html).not.toContain('Lort Cha')
    expect(html).not.toContain('Mie Goreng')
    expect(html).not.toContain('Pancit Canton')
    expect(html).not.toContain('Similar dishes from other regions')
    expect(renderedMatches(html)).toEqual(selectMoreOptions(PAINTED_SESSION, recommend(PAINTED_SESSION, dishes)).map(
      (result, index) => `#${index + 4} ${result.dish.name}, ${Math.round(result.displayMatchPercent)}% match`,
    ))
  })

  it('derives both matches and chips from changed discovery answers', () => {
    const session = { ...PAINTED_SESSION, flavors: ['rich'], adventurousness: 'familiar', region: 'east-asia' }
    useDiscoverySession.mockReturnValue(session)
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual(selectMoreOptions(session, recommend(session, dishes)).map(
      (result, index) => `#${index + 4} ${result.dish.name}, ${Math.round(result.displayMatchPercent)}% match`,
    ))
    const header = html.match(/<header\b[\s\S]*?<\/header>/)[0]
    expect(header).toContain('Familiar')
    expect(header).toContain('East Asian')
    expect(header).toContain('Rich')
    expect(header).not.toContain('Southeast Asian')
    expect(header).not.toContain('Spicy')
  })

  it('labels the cross-region transition after exhausting relevant Latin American candidates', () => {
    useDiscoverySession.mockReturnValue({ ...PAINTED_SESSION, region: 'latin-america' })
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual([
      '#4 Feijoada, 42% match', '#5 Arroz Chaufa, 42% match', '#6 Ají de Gallina, 42% match',
      '#7 Jerk Chicken, 42% match', '#8 Mofongo, 42% match', '#9 Lort Cha, 70% match', '#10 Reshteh Polow, 70% match',
    ])
    const label = html.indexOf('Similar dishes from other regions')
    expect(label).toBeGreaterThan(html.indexOf('<article aria-label="#8 Mofongo'))
    expect(label).toBeLessThan(html.indexOf('<article aria-label="#9 Lort Cha'))
    expect(html.match(/Similar dishes from other regions/g)).toHaveLength(1)
  })

  it.each([null, 'surprise-me'])('retains the global seven-result behavior with region %s', region => {
    const session = { ...PAINTED_SESSION, region }
    useDiscoverySession.mockReturnValue(session)
    const html = renderScreen()
    expect(renderedMatches(html)).toEqual(recommend(session, dishes).slice(3, 10).map(
      (result, index) => `#${index + 4} ${result.dish.name}, ${Math.round(result.displayMatchPercent)}% match`,
    ))
    expect(html).not.toContain('Similar dishes from other regions')
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
