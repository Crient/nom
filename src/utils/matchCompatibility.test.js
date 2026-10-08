import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import { BASE_WEIGHTS, recommend, scoreDish } from './recommendationEngine'
import { whyMatched } from './whyMatched'
import { createSurpriseSession } from './surpriseSession'

const open = { foodType: 'anything', flavors: ['spicy', 'comforting'], adventurousness: 'surprise-me', region: 'surprise-me' }
const ids = results => results.map(result => result.dish.id)

describe('evidence ranking and display compatibility', () => {
  it.each([['nasi-goreng', 100, 30, 100], ['lort-cha', 50, 15, 85], ['mie-goreng', 50, 15, 85]])('explains both scores for %s', (id, rank, flavorPoints, percent) => {
    const result = scoreDish(open, dishes.find(dish => dish.id === id))
    expect(result.rankingScore).toBe(rank)
    expect(result.displayMatchPercent).toBe(percent)
    for (const [dimension, points] of Object.entries(BASE_WEIGHTS)) {
      expect(result.displayBreakdown[dimension].available).toBe(points)
      expect(result.displayBreakdown[dimension].earned).toBe(dimension === 'flavor' ? flavorPoints : points)
    }
    expect(result.breakdown.flavor.earned).toBe(rank)
    expect(result.breakdown.region.skipped).toBe(true)
    expect(result.displayBreakdown.region.open).toBe(true)
    expect(whyMatched(open, result)).not.toMatch(/points|explicit-preference|rounded|\d+%/i)
  })
  it('does not score descriptors, inflate explicit mismatches or credit missing region answers', () => {
    const dish = dishes.find(item => item.id === 'lort-cha')
    const result = scoreDish({ ...open, foodType: 'rice', region: null }, dish)
    expect(result.displayBreakdown.foodType.earned).toBe(0)
    expect(result.displayBreakdown.region.skipped).toBe(true)
    expect(result.displayBreakdown.region.earned).toBe(0)
    expect(result.displayBreakdown.flavor.matched).toEqual(['comforting'])
    expect(result.displayMatchPercent).toBeCloseTo(35 / 85 * 100)
    const explicit = scoreDish({ foodType: 'noodle', flavors: ['spicy'], adventurousness: 'familiar', region: 'europe' }, dish)
    expect(explicit.displayMatchPercent).toBe(explicit.rankingScore)
  })
  it('varies equal-quality Top Matches by seed, preserves scores and never lets weaker evidence displace stronger evidence', () => {
    expect(ids(recommend(open, dishes))).toEqual(ids(recommend(open, [...dishes].reverse())))
    const topSets = new Set()
    for (let seed = 0; seed < 20; seed++) {
      const session = { ...open, recommendationSeed: seed }
      const results = recommend(session, dishes)
      expect(results).toEqual(recommend(session, dishes))
      expect(ids(results)).toEqual(ids(recommend(session, [...dishes].reverse())))
      expect(new Set(ids(results)).size).toBe(dishes.length)
      expect(results.every((result, i) => i === 0 || results[i - 1].rankingScore >= result.rankingScore)).toBe(true)
      expect(results.slice(0, 3).map(result => result.rankingScore)).toEqual(recommend(open, dishes).slice(0, 3).map(result => result.rankingScore))
      topSets.add(ids(results.slice(0, 3)).join(','))
    }
    expect(topSets.size).toBeGreaterThan(10)
  })
  it('joint diversity penalties spread country/adventure across repeated seeded trials', () => {
    const catalog = Array.from({ length: 18 }, (_, i) => ({ ...dishes[0], id: `fixture-${i}`, country: `country-${i % 3}`, adventureLevel: i % 3 + 1, preferenceFlavors: ['spicy', 'comforting'] }))
    let distinct = 0
    for (let seed = 0; seed < 100; seed++) {
      const top = recommend({ ...open, recommendationSeed: seed }, catalog).slice(0, 3)
      if (new Set(top.map(result => result.dish.country)).size === 3) distinct++
    }
    expect(distinct).toBeGreaterThan(70)
  })
  it('keeps explicit sessions deterministic despite seeds and open compatibility does not replace swipe relevance', () => {
    const explicit = { foodType: 'noodle', flavors: ['spicy'], adventurousness: 'adventurous', region: 'southeast-asia' }
    expect(recommend({ ...explicit, recommendationSeed: 1 }, dishes)).toEqual(recommend({ ...explicit, recommendationSeed: 999 }, dishes))
    const results = recommend({ ...open, recommendationSeed: 1 }, dishes)
    const swipe = createSurpriseSession({ random: () => .5 })
    const previews = [0, 1, 2].map(offset => swipe.peek(open, results, offset))
    expect([0, 1, 2].map(offset => swipe.peek(open, results, offset))).toEqual(previews)
    expect(swipe.next(open, results)).toBe(previews[0])
    expect(swipe.next(open, results)).toBe(previews[1])
    expect(swipe.previous(open, results)).toBe(previews[0])
    expect(swipe.next(open, results)).toBe(previews[1])
  })
})
