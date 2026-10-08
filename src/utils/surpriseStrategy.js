import { dishes } from '../data/dishes'

// The catalog is the eligibility boundary. Future strategies may rank these
// candidates using account signals; randomV1 deliberately ignores preferences.
export const randomV1 = {
  id: 'randomV1',
  select({ candidates, avoidId, random = Math.random }) {
    const pool = candidates.length > 1 ? candidates.filter(dish => dish.id !== avoidId) : candidates
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? null
  },
}

export function chooseSurprise({ strategy = randomV1, avoidId, random, signals } = {}) {
  const dish = strategy.select({ candidates: dishes, avoidId, random, signals })
  // A replacement strategy cannot introduce an unvalidated or QA dish.
  return dishes.find(candidate => candidate.id === dish?.id) ?? null
}

export const randomSurpriseResults = dishes.map(dish => ({ dish, score: 1, selectionStrategy: randomV1.id }))
export const randomSurpriseContext = Object.freeze({ foodType: 'anything', flavors: [], adventurousness: 'surprise-me', region: 'surprise-me' })
export const surpriseQuery = '?surprise=1'
export function isRandomSurprise(search) { return new URLSearchParams(search).get('surprise') === '1' }
