import { describe, expect, it } from 'vitest'

import { dishes } from '../data/dishes'
import {
  ADVENTURE_FIT,
  BASE_WEIGHTS,
  recommend,
  normalizeWeights,
  scoreDish,
  SURPRISE_ME,
} from './recommendationEngine'

const PAINTED_SESSION = {
  foodType: 'noodle',
  flavors: ['spicy', 'comforting'],
  adventurousness: 'adventurous',
  region: 'southeast-asia',
}

const fixture = [
  {
    id: 'alpha-noodle',
    name: 'Alpha Noodle',
    country: 'Cambodia',
    flag: '🇰🇭',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['spicy', 'comforting'],
    familiarity: 3,
  },
  {
    id: 'beta-rice',
    name: 'Beta Rice',
    country: 'Japan',
    flag: '🇯🇵',
    region: 'east-asia',
    foodType: 'rice',
    flavors: ['comforting'],
    familiarity: 1,
  },
  {
    id: 'gamma-noodle',
    name: 'Gamma Noodle',
    country: 'Vietnam',
    flag: '🇻🇳',
    region: 'southeast-asia',
    foodType: 'noodle',
    flavors: ['spicy'],
    familiarity: 2,
  },
  {
    id: 'delta-noodle',
    name: 'Delta Noodle',
    country: 'Ethiopia',
    flag: '🇪🇹',
    region: 'africa',
    foodType: 'noodle',
    flavors: ['spicy', 'comforting'],
    familiarity: 3,
  },
]

function byId(results, id) {
  return results.find((result) => result.dish.id === id)
}

describe('normalizeWeights', () => {
  it('keeps a full session at 35/30/20/15 totaling 100', () => {
    const weights = normalizeWeights(PAINTED_SESSION)
    expect(weights.foodType).toBe(35)
    expect(weights.flavor).toBe(30)
    expect(weights.adventure).toBe(20)
    expect(weights.region).toBe(15)
    expect(weights.foodType + weights.flavor + weights.adventure + weights.region).toBe(100)
  })

  it('redistributes when region is skipped so the maximum remains 100', () => {
    const weights = normalizeWeights({ ...PAINTED_SESSION, region: null })
    const scale = 100 / 85
    expect(weights.foodType).toBeCloseTo(35 * scale)
    expect(weights.flavor).toBeCloseTo(30 * scale)
    expect(weights.adventure).toBeCloseTo(20 * scale)
    expect(weights.region).toBe(0)
    expect(weights.foodType + weights.flavor + weights.adventure + weights.region).toBeCloseTo(100)
  })

  it('redistributes when foodType is anything so the maximum remains 100', () => {
    const weights = normalizeWeights({ ...PAINTED_SESSION, foodType: 'anything' })
    const scale = 100 / 65
    expect(weights.foodType).toBe(0)
    expect(weights.flavor).toBeCloseTo(30 * scale)
    expect(weights.adventure).toBeCloseTo(20 * scale)
    expect(weights.region).toBeCloseTo(15 * scale)
    expect(weights.foodType + weights.flavor + weights.adventure + weights.region).toBeCloseTo(100)
  })
})

describe('food type', () => {
  it('awards the full food-type weight for an exact match', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[0])
    expect(result.breakdown.foodType.available).toBe(35)
    expect(result.breakdown.foodType.earned).toBe(35)
    expect(result.breakdown.foodType.matched).toBe(true)
  })
})

describe('flavor', () => {
  it('gives a single selected flavor the whole flavor weight', () => {
    const session = { ...PAINTED_SESSION, flavors: ['comforting'] }
    const result = scoreDish(session, fixture[1])
    expect(result.breakdown.flavor.available).toBe(30)
    expect(result.breakdown.flavor.earned).toBe(30)
    expect(result.breakdown.flavor.matched).toEqual(['comforting'])
    expect(result.breakdown.flavor.missed).toEqual([])
  })

  it('splits the flavor weight equally across two selected flavors', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[0])
    expect(result.breakdown.flavor.available).toBe(30)
    expect(result.breakdown.flavor.earned).toBe(30)
    expect(result.breakdown.flavor.matched).toEqual(['spicy', 'comforting'])
  })

  it('gives one-of-two flavor matches half credit, not the full 30', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[2])
    expect(result.breakdown.flavor.earned).toBe(15)
    expect(result.breakdown.flavor.matched).toEqual(['spicy'])
    expect(result.breakdown.flavor.missed).toEqual(['comforting'])
  })
})

describe('adventure', () => {
  it('awards full adventure weight for an exact familiarity match', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[0])
    expect(result.breakdown.adventure.earned).toBe(20)
    expect(result.breakdown.adventure.distance).toBe(0)
    expect(result.breakdown.adventure.fit).toBe(ADVENTURE_FIT.exact)
  })

  it('awards 60% of adventure weight when familiarity is one level away', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[2])
    expect(result.breakdown.adventure.earned).toBeCloseTo(20 * ADVENTURE_FIT.oneLevel)
    expect(result.breakdown.adventure.distance).toBe(1)
  })

  it('awards 20% of adventure weight when familiarity is two levels away', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[1])
    expect(result.breakdown.adventure.earned).toBeCloseTo(20 * ADVENTURE_FIT.twoLevels)
    expect(result.breakdown.adventure.distance).toBe(2)
  })
})

describe('region', () => {
  it('awards the full region weight for an exact match', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[0])
    expect(result.breakdown.region.earned).toBe(15)
    expect(result.breakdown.region.matched).toBe(true)
  })

  it('does not penalize any dish when region is skipped', () => {
    const session = { ...PAINTED_SESSION, region: null }
    const sea = scoreDish(session, fixture[0])
    const africa = scoreDish(session, fixture[3])
    expect(sea.breakdown.region.skipped).toBe(true)
    expect(sea.breakdown.region.earned).toBe(0)
    expect(africa.score).toBeCloseTo(sea.score)
    expect(sea.score).toBeCloseTo(100)
  })
})

describe('anything food type', () => {
  it('does not award food-type points to every dish', () => {
    const session = { ...PAINTED_SESSION, foodType: 'anything' }
    const noodle = scoreDish(session, fixture[0])
    const rice = scoreDish(session, fixture[1])
    expect(noodle.breakdown.foodType.skipped).toBe(true)
    expect(noodle.breakdown.foodType.earned).toBe(0)
    expect(rice.breakdown.foodType.earned).toBe(0)
    expect(noodle.score).toBeGreaterThan(rice.score)
  })
})

describe('Surprise Me', () => {
  it('does not treat region surprise-me as an exact region match', () => {
    const exact = recommend(PAINTED_SESSION, fixture)
    const surprise = recommend({ ...PAINTED_SESSION, region: SURPRISE_ME }, fixture)

    expect(byId(exact, 'delta-noodle').breakdown.region.earned).toBe(0)
    expect(byId(exact, 'alpha-noodle').score).toBeGreaterThan(byId(exact, 'delta-noodle').score)

    expect(byId(surprise, 'delta-noodle').breakdown.region.skipped).toBe(true)
    expect(byId(surprise, 'alpha-noodle').score).toBeCloseTo(byId(surprise, 'delta-noodle').score)
    expect(byId(surprise, 'alpha-noodle').score).toBeCloseTo(100)
  })

  it('does not treat adventure surprise-me as familiarity 1, 2, or 3', () => {
    const familiarDish = { ...fixture[0], id: 'alpha-familiar', familiarity: 1 }
    const surpriseSession = { ...PAINTED_SESSION, adventurousness: SURPRISE_ME }

    const exactAdventurous = scoreDish(PAINTED_SESSION, fixture[0])
    const exactFamiliar = scoreDish(PAINTED_SESSION, familiarDish)
    expect(exactAdventurous.score).toBeGreaterThan(exactFamiliar.score)
    expect(exactFamiliar.breakdown.adventure.earned).toBeCloseTo(20 * ADVENTURE_FIT.twoLevels)

    const surpriseAdventurous = scoreDish(surpriseSession, fixture[0])
    const surpriseFamiliar = scoreDish(surpriseSession, familiarDish)
    expect(surpriseAdventurous.breakdown.adventure.skipped).toBe(true)
    expect(surpriseFamiliar.breakdown.adventure.earned).toBe(0)
    expect(surpriseAdventurous.score).toBeCloseTo(surpriseFamiliar.score)
    expect(surpriseAdventurous.score).toBeCloseTo(100)
  })
})

describe('score bounds and ranking', () => {
  it('caps a perfect match at 100', () => {
    const result = scoreDish(PAINTED_SESSION, fixture[0])
    expect(result.score).toBe(100)
  })

  it('never returns a score above 100', () => {
    const sessions = [
      PAINTED_SESSION,
      { ...PAINTED_SESSION, region: null },
      { ...PAINTED_SESSION, foodType: 'anything' },
      { ...PAINTED_SESSION, region: SURPRISE_ME, adventurousness: SURPRISE_ME },
    ]

    for (const session of sessions) {
      for (const result of recommend(session, [...fixture, ...dishes])) {
        expect(result.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('returns identical ranking across repeated runs', () => {
    const first = recommend(PAINTED_SESSION, dishes).map((result) => result.dish.id)
    const second = recommend(PAINTED_SESSION, dishes).map((result) => result.dish.id)
    expect(second).toEqual(first)
  })

  it('does not mutate the source catalog', () => {
    const snapshot = dishes.map((dish) => ({
      id: dish.id,
      flavors: [...dish.flavors],
      familiarity: dish.familiarity,
    }))
    recommend(PAINTED_SESSION, dishes)
    expect(dishes.map((dish) => ({ id: dish.id, flavors: dish.flavors, familiarity: dish.familiarity }))).toEqual(
      snapshot,
    )
  })
})

describe('painted Figma session against the V1 catalog', () => {
  it('ranks all 10 dishes and reports honest scores', () => {
    const results = recommend(PAINTED_SESSION, dishes)
    expect(results).toHaveLength(10)
    expect(results.map((result) => result.dish.id)).toEqual([
      'lort-cha',
      'pancit-bihon',
      'num-banh-chok',
      'mi-quang',
      'cao-lau',
      'mie-goreng',
      'pancit-canton',
      'char-kway-teow',
      'hokkien-mee',
      'kolo-mee',
    ])

    const scores = Object.fromEntries(results.map((result) => [result.dish.id, result.score]))
    expect(scores['lort-cha']).toBe(85)
    expect(scores['pancit-bihon']).toBe(77)
    expect(scores['num-banh-chok']).toBe(77)
    expect(scores['mi-quang']).toBe(70)
    expect(scores['cao-lau']).toBe(70)
    expect(scores['mie-goreng']).toBe(62)
    expect(scores['pancit-canton']).toBe(62)

    const lortCha = byId(results, 'lort-cha')
    expect(lortCha.breakdown.foodType.earned).toBe(35)
    expect(lortCha.breakdown.flavor.earned).toBe(15)
    expect(lortCha.breakdown.flavor.matched).toEqual(['comforting'])
    expect(lortCha.breakdown.flavor.missed).toEqual(['spicy'])
    expect(lortCha.breakdown.adventure.earned).toBe(20)
    expect(lortCha.breakdown.region.earned).toBe(15)
  })
})

describe('base weights', () => {
  it('sum to 100', () => {
    expect(BASE_WEIGHTS.foodType + BASE_WEIGHTS.flavor + BASE_WEIGHTS.adventure + BASE_WEIGHTS.region).toBe(100)
  })
})
