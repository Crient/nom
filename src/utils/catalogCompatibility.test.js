import assert from 'node:assert/strict'
import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import taxonomy from '../data/catalog/taxonomy.json'
import { recommend, scoreDish } from './recommendationEngine'

const levels = { familiar: 1, different: 2, adventurous: 3 }
const regions = [...taxonomy.regions, null, 'surprise-me']
const adventures = [...Object.keys(levels), 'surprise-me']
const flavors = [...taxonomy.preferenceFlavors.map(id => [id]),
  ['spicy', 'comforting'], ['fresh', 'tangy'], taxonomy.preferenceFlavors]
const foodTypes = [...taxonomy.foodTypes, 'anything']
const indexById = new Map(dishes.map((dish, index) => [dish.id, index]))
const fingerprint = results => results.map(({ dish, score }) => [dish.id, score])

describe('201-dish recommendation compatibility', () => {
  // 6 food-type choices × 9 flavor sets × 4 adventure choices × 10 region choices
  // = 2,160 sessions; each is evaluated twice against the complete dataset.
  it.each(foodTypes)('scores all 201 dishes consistently across %s sessions', foodType => {
    const snapshot = JSON.stringify(dishes)
    for (const selected of flavors) for (const adventurousness of adventures) for (const region of regions) {
      const session = { foodType, flavors: selected, adventurousness, region }
      const results = recommend(session, dishes)
      assert.equal(results.length, 201)
      assert.equal(new Set(results.map(result => result.dish.id)).size, 201)
      assert.deepEqual(fingerprint(recommend(session, dishes)), fingerprint(results))

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const dish = result.dish
        assert.equal(dish, dishes[indexById.get(dish.id)])
        assert.ok(Number.isFinite(result.score) && result.score >= 0 && result.score <= 100 + 1e-10)
        const previous = results[i - 1]
        if (previous) {
          assert.ok(previous.score >= result.score)
          if (previous.score === result.score && region !== 'surprise-me' && adventurousness !== 'surprise-me') {
            assert.ok(indexById.get(previous.dish.id) < indexById.get(dish.id))
          }
        }

        // Independent check of the frozen 35/30/20/15 formula and inactive dimensions.
        const typeActive = foodType !== 'anything'
        const adventureActive = adventurousness !== 'surprise-me'
        const regionActive = region !== null && region !== 'surprise-me'
        const scale = 100 / ((typeActive ? 35 : 0) + 30 + (adventureActive ? 20 : 0) + (regionActive ? 15 : 0))
        const distance = adventureActive ? Math.abs(levels[adventurousness] - dish.adventureLevel) : null
        const fit = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.2
        const matched = selected.filter(flavor => dish.preferenceFlavors.includes(flavor))
        const expected = (typeActive && foodType === dish.foodType ? 35 * scale : 0)
          + (30 * scale / selected.length * matched.length)
          + (adventureActive ? 20 * scale * fit : 0)
          + (regionActive && region === dish.region ? 15 * scale : 0)
        assert.ok(Math.abs(result.score - expected) < 1e-9)
        assert.deepEqual(result.matchedAttributes.preferenceFlavors, matched)
        assert.equal(result.breakdown.foodType.skipped, !typeActive)
        assert.equal(result.breakdown.adventure.skipped, !adventureActive)
        assert.equal(result.breakdown.region.skipped, !regionActive)
      }
    }
    assert.equal(JSON.stringify(dishes), snapshot)
  }, 30000)

  it('can score a perfect matching session for every canonical dish and all three adventure levels', () => {
    for (const dish of dishes) {
      const adventurousness = Object.keys(levels).find(key => levels[key] === dish.adventureLevel)
      const result = scoreDish({ foodType: dish.foodType, flavors: dish.preferenceFlavors, adventurousness, region: dish.region }, dish)
      expect(result.score).toBeCloseTo(100)
    }
  })

  it('does not use review status, aliases, notes, descriptors, or images for scoring', () => {
    const session = { foodType: 'anything', flavors: ['crispy'], adventurousness: 'different', region: null }
    for (const dish of dishes) {
      const changedMetadata = { ...dish, reviewStatus: 'approved', descriptors: ['savory'], aliases: [], notes: '', image: 'different' }
      expect(scoreDish(session, changedMetadata).score).toBe(scoreDish(session, dish).score)
      expect(scoreDish(session, dish).breakdown.flavor.earned).toBe(dish.preferenceFlavors.includes('crispy') ? 60 : 0)
    }
  })
})
