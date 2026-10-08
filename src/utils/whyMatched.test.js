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
  it('keeps every canonical dish explanation free of scoring language', () => {
    for (const dish of dishes) {
      expect(explain(PAINTED_SESSION, dish)).not.toMatch(/points|weight|score|compatibility|rounded|ranking|algorithm|explicit-preference|\d+%/i)
    }
  })
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
    expect(explanation).not.toMatch(/points|weight|compatibility|rounded|ranking|algorithm/i)
    expect(explanation).not.toMatch(/Southeast|adventurous preference/i)
  })

  it('does not claim food type or region matches when neither matched', () => {
    const explanation = explain({ ...PAINTED_SESSION, foodType: 'rice', region: 'east-asia' })
    expect(explanation).toContain('comforting flavors')
    expect(explanation).not.toMatch(/rice|noodles|Asian|cuisine/i)
  })

  it('does not present a partial adventure fit as an exact match', () => {
    const session = { ...PAINTED_SESSION, foodType: 'rice', flavors: ['tangy'], region: 'east-asia' }
    const explanation = explain(session, dishes.find((dish) => dish.id === 'mie-goreng'))
    expect(explanation).toContain('Mie Goreng')
    expect(explanation).toContain('something a little different to explore')
    expect(explanation).not.toMatch(/tangy|rice|Asian|matches your/i)
  })

  it('does not claim anything as a food-type match', () => {
    expect(explain({ ...PAINTED_SESSION, foodType: 'anything' })).not.toMatch(/noodles|anything/i)
  })

  it('handles a session with no active scoring dimensions', () => {
    expect(explain({ foodType: 'anything', flavors: [], adventurousness: SURPRISE_ME, region: null }))
      .toBe('Lort Cha is a dish worth discovering. Explore it for something new.')
  })
  it('adds concise mood context from matched tags and explains the selected familiar experience', () => {
    const explanation = explain({ foodType: 'anything', flavors: ['comforting'], adventurousness: 'familiar', region: null }, dishes.find(dish => dish.id === 'couscous'))
    expect(explanation).toContain('Couscous matches comforting flavors')
    expect(explanation).toContain('a cozy, satisfying meal')
    expect(explanation).toContain('your familiar preference')
    expect(explanation).not.toMatch(/points|weight|compatibility|rounded|ranking|algorithm|\d+%/i)
  })
})
