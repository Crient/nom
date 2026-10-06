import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import taxonomy from '../data/catalog/taxonomy.json'
import { recommend, selectMoreOptions, scoreDish } from './recommendationEngine'
const flavors = taxonomy.preferenceFlavors.flatMap((a, i) => [[a], ...taxonomy.preferenceFlavors.slice(i + 1).map(b => [a, b])])

describe('recommendation audit regression', () => {
  it('keeps 3 + 7 unique candidate-specific results across every supported input combination', () => {
    for (const foodType of [...taxonomy.foodTypes, 'anything']) {
      for (const selected of flavors) {
        for (const adventurousness of ['familiar', 'different', 'adventurous', 'surprise-me']) {
          for (const region of [...taxonomy.regions, null, 'surprise-me']) {
            const session = { foodType, flavors: selected, adventurousness, region }
            const results = recommend(session, dishes)
            const top = results.slice(0, 3), more = selectMoreOptions(session, results)
            expect(top).toHaveLength(3)
            expect(more).toHaveLength(7)
            expect(new Set([...top, ...more].map(r => r.dish.id)).size).toBe(10)
            expect(selectMoreOptions(session, results)).toEqual(more)
            for (const result of [...top, ...more]) {
              expect(result).toBe(results.find(item => item.dish.id === result.dish.id))
              expect(result.score).toBe(scoreDish(session, result.dish).score)
              expect(result.score).toBeGreaterThanOrEqual(0)
              expect(result.score).toBeLessThanOrEqual(100)
            }
            if (region && region !== 'surprise-me' && foodType !== 'anything') {
              expect(top.every(r => r.dish.region === region)).toBe(true)
            }
          }
        }
      }
    }
  }, 15000)

  it('fills the former two-card Anything/Surprise Me shortfall without displacing relevant results', () => {
    const session = { foodType: 'anything', flavors: ['spicy', 'tangy'], adventurousness: 'surprise-me', region: 'europe' }
    const results = recommend(session, dishes), more = selectMoreOptions(session, results)
    const relevant = results.slice(3).filter(r => r.score >= 40)
    expect(relevant).toHaveLength(2)
    expect(more).toHaveLength(7)
    for (const result of relevant) expect(more).toContain(result)
    expect(more.map(r => r.dish.id)).toEqual([
      'borscht', 'carbonara', 'french-onion-soup', 'paella', 'goulash', 'souvlaki', 'yassa',
    ])
    expect(more.slice(0, 6).every(r => r.dish.region === 'europe')).toBe(true)
    expect(more.map(r => r.score)).toEqual([...more].map(r => scoreDish(session, r.dish).score))
  })

  it('allows genuine ties while retaining different scores where catalog attributes differ', () => {
    const session = { foodType: 'noodle', flavors: ['spicy', 'comforting'], adventurousness: 'adventurous', region: 'southeast-asia' }
    const results = recommend(session, dishes)
    const get = id => results.find(r => r.dish.id === id)
    expect(get('lort-cha').score).toBe(85)
    expect(get('mie-goreng').score).toBe(77)
    expect(get('pancit-canton').score).toBe(77)
    expect(get('mi-quang').score).toBe(70)
    expect(get('lort-cha').breakdown.flavor.matched).toEqual(['comforting'])
    expect(get('mie-goreng').breakdown.flavor.matched).toEqual(['spicy'])
    expect(get('mie-goreng').breakdown).not.toBe(get('pancit-canton').breakdown)
  })
})
