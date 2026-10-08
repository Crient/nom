import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import { chooseSurprise, randomV1, randomSurpriseContext, randomSurpriseResults } from './surpriseStrategy'
import { createSurpriseSession } from './surpriseSession'

describe('randomV1 canonical Surprise strategy', () => {
  it('offers all 201 canonical dishes once per deck cycle without immediate repeats at the boundary', () => {
    const deck = createSurpriseSession({ random: () => .5 })
    const firstCycle = dishes.map(() => deck.next(randomSurpriseContext, randomSurpriseResults).dish.id)
    expect(new Set(firstCycle).size).toBe(201)
    expect(new Set(firstCycle)).toEqual(new Set(dishes.map(dish => dish.id)))
    expect(deck.next(randomSurpriseContext, randomSurpriseResults).dish.id).not.toBe(firstCycle.at(-1))
  })
  it('gives every production dish an equal selection interval across all countries', () => {
    expect(dishes).toHaveLength(201)
    const draws = dishes.map((_, index) => chooseSurprise({ random: () => (index + .5) / dishes.length }))
    expect(draws).toEqual(dishes)
    expect(new Set(draws.map(dish => dish.countryCode))).toEqual(new Set(dishes.map(dish => dish.countryCode)))
  })
  it('excludes the last dish without shrinking eligibility beyond that one item', () => {
    const last = dishes[37], eligible = dishes.filter(dish => dish.id !== last.id)
    expect(eligible.map((_, index) => chooseSurprise({ avoidId: last.id, random: () => (index + .5) / eligible.length }))).toEqual(eligible)
    expect(randomV1.select({ candidates: [last], avoidId: last.id })).toBe(last)
  })
  it('accepts a future strategy and signals but returns only the canonical record', () => {
    const signals = { favorites: ['lort-cha'], meals: [], feedback: [], history: [] }
    const strategy = { select: ({ candidates, signals: received }) => {
      expect(received).toBe(signals)
      return { ...candidates[0], name: 'Untrusted model output' }
    } }
    expect(chooseSurprise({ strategy, signals })).toBe(dishes[0])
    expect(chooseSurprise({ strategy: { select: () => ({ id: 'qa-dish' }) } })).toBeNull()
  })
})
