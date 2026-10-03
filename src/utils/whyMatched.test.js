import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import { scoreDish, SURPRISE_ME } from './recommendationEngine'
import { whyMatched } from './whyMatched'

const PAINTED_SESSION = {
  foodType: 'noodle',
  flavors: ['spicy', 'comforting'],
  adventurousness: 'adventurous',
  region: 'southeast-asia',
}
const lortCha = dishes.find((dish) => dish.id === 'lort-cha')

function explain(session = PAINTED_SESSION, dish = lortCha) {
  return whyMatched(session, scoreDish(session, dish))
}

describe('whyMatched', () => {
  it('explains every exact matched dimension without claiming missed flavors or descriptors', () => {
    const explanation = explain()
    expect(explanation).toContain('Lort Cha')
    expect(explanation).toContain('noodles')
    expect(explanation).toContain('comforting flavors')
    expect(explanation).toContain('your adventurous preference')
    expect(explanation).toContain('Southeast Asian cuisine')
    expect(explanation).not.toMatch(/spicy|savory|smoky/i)
  })

  it('includes both flavors when both actually match', () => {
    expect(explain({ ...PAINTED_SESSION, flavors: ['comforting', 'fresh'] }, dishes.find((dish) => dish.id === 'num-banh-chok')))
      .toContain('comforting and fresh flavors')
  })

  it('omits a skipped region', () => {
    const explanation = explain({ ...PAINTED_SESSION, region: null })
    expect(explanation).toContain('comforting flavors')
    expect(explanation).not.toMatch(/Southeast|region|cuisine/i)
  })

  it('does not treat Surprise Me as an exact region or adventure preference', () => {
    const explanation = explain({ ...PAINTED_SESSION, region: SURPRISE_ME, adventurousness: SURPRISE_ME })
    expect(explanation).toContain('noodles')
    expect(explanation).toContain('comforting flavors')
    expect(explanation).not.toMatch(/Southeast|region|cuisine|adventurous|surprise/i)
  })

  it('does not claim food type or region matches when neither matched', () => {
    const explanation = explain({ ...PAINTED_SESSION, foodType: 'rice', region: 'east-asia' })
    expect(explanation).toContain('comforting flavors')
    expect(explanation).not.toMatch(/rice|noodles|Asian|cuisine/i)
  })

  it('does not present a partial adventure fit as an exact match', () => {
    const session = { ...PAINTED_SESSION, foodType: 'rice', flavors: ['spicy'], region: 'east-asia' }
    const explanation = explain(session, dishes.find((dish) => dish.id === 'mie-goreng'))
    expect(explanation).toContain('Mie Goreng')
    expect(explanation).toContain('partial fit')
    expect(explanation).not.toMatch(/spicy|rice|Asian|matches your/i)
  })

  it('does not claim anything as a food-type match', () => {
    expect(explain({ ...PAINTED_SESSION, foodType: 'anything' })).not.toMatch(/noodles|anything/i)
  })

  it('handles a session with no active scoring dimensions', () => {
    expect(explain({ foodType: 'anything', flavors: [], adventurousness: SURPRISE_ME, region: null }))
      .toBe('Lort Cha has no exact matches with the preferences scored in this session.')
  })
})
