import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import { recommend, selectMoreOptions } from './recommendationEngine'
import { createSurpriseSession, surpriseCandidates } from './surpriseSession'

const session = { foodType: 'anything', flavors: ['spicy', 'comforting'], adventurousness: 'surprise-me', region: 'surprise-me' }
const ranked = recommend(session, dishes)
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
describe('ephemeral Surprise Me variety', () => {
  it('undoes multiple skips and replays their next cards without consuming extra queue entries', () => {
    const queue = createSurpriseSession({ random: seeded(42) }), control = createSurpriseSession({ random: seeded(42) })
    expect(queue.previous(session, ranked)).toBeNull()
    expect(queue.canGoBack(session)).toBe(false)
    const first = queue.next(session, ranked), second = queue.next(session, ranked), third = queue.next(session, ranked)
    for (let index = 0; index < 3; index++) control.next(session, ranked)
    const upcoming = queue.peek(session, ranked)
    expect(queue.previous(session, ranked)).toBe(second)
    expect(queue.peek(session, ranked)).toBe(third)
    expect(queue.previous(session, ranked)).toBe(first)
    expect(queue.previous(session, ranked)).toBeNull()
    expect(queue.canGoBack(session)).toBe(false)
    expect(queue.next(session, ranked)).toBe(second)
    expect(queue.canGoBack(session)).toBe(true)
    expect(queue.next(session, ranked)).toBe(third)
    expect(queue.next(session, ranked)).toBe(upcoming)
    expect(upcoming.dish.id).toBe(control.next(session, ranked).dish.id)
    const remaining = Array.from({ length: surpriseCandidates(session, ranked).length - 4 }, () => queue.next(session, ranked).dish.id)
    expect(new Set([first.dish.id, second.dish.id, third.dish.id, upcoming.dish.id, ...remaining]).size).toBe(surpriseCandidates(session, ranked).length)
  })
  it('undoes across exhaustion without reshuffling the pending next cycle or causing an immediate repeat', () => {
    const queue = createSurpriseSession({ random: seeded(18) }), control = createSurpriseSession({ random: seeded(18) }), pool = ranked.slice(0, 3)
    const drawn = Array.from({ length: 4 }, () => queue.next(session, pool))
    for (let index = 0; index < 4; index++) control.next(session, pool)
    const upcoming = queue.peek(session, pool)
    expect(queue.previous(session, pool)).toBe(drawn[2])
    expect(queue.next(session, pool)).toBe(drawn[3])
    expect(queue.next(session, pool)).toBe(upcoming)
    expect(upcoming.dish.id).not.toBe(drawn[3].dish.id)
    expect(upcoming.dish.id).toBe(control.next(session, pool).dish.id)
  })
  it('clears previous navigation when preferences change and on reset', () => {
    const queue = createSurpriseSession({ random: seeded(42) })
    queue.next(session, ranked); queue.next(session, ranked)
    const rice = { ...session, foodType: 'rice' }, riceResults = recommend(rice, dishes)
    expect(queue.canGoBack(rice)).toBe(false)
    expect(queue.previous(rice, riceResults)).toBeNull()
    expect(queue.next(rice, riceResults).dish.foodType).toBe('rice')
    expect(queue.canGoBack(rice)).toBe(false)
    queue.reset(); expect(queue.previous(rice, riceResults)).toBeNull()
  })
  it('does not replay a removed candidate after undo when the available pool changes', () => {
    const queue = createSurpriseSession({ random: seeded(42) })
    const first = queue.next(session, ranked), second = queue.next(session, ranked), third = queue.next(session, ranked)
    expect(queue.previous(session, ranked)).toBe(second)
    const narrowed = ranked.filter(result => result.dish.id !== third.dish.id)
    expect(queue.peek(session, narrowed).dish.id).not.toBe(third.dish.id)
    expect(queue.next(session, narrowed).dish.id).not.toBe(third.dish.id)
    expect(queue.previous(session, narrowed)).toBe(second)
    expect(queue.previous(session, narrowed)).toBe(first)
  })
  it('previews the exact next draw without consuming history or changing exhaustion order', () => {
    const queue = createSurpriseSession({ random: seeded(42) }), control = createSurpriseSession({ random: seeded(42) })
    const count = surpriseCandidates(session, ranked).length
    for (let index = 0; index < count * 2 + 2; index++) {
      const peek = queue.peek(session, ranked)
      expect(queue.peek(session, ranked)).toBe(peek)
      expect(queue.next(session, ranked)).toBe(peek)
      expect(peek.dish.id).toBe(control.next(session, ranked).dish.id)
    }
    expect(queue.peek(session, ranked.slice(0, 1))).toBeNull()
    expect(queue.peek(session, [])).toBeNull()
  })
  it.each([2, 3, 12])('preloads two draws without changing weighted order over three cycles of %s candidates', size => {
    const pool = ranked.slice(0, size), queue = createSurpriseSession({ random: seeded(19) }), control = createSurpriseSession({ random: seeded(19) })
    const expected = Array.from({ length: size * 3 + 3 }, () => control.next(session, pool).dish.id)
    expect(queue.next(session, pool).dish.id).toBe(expected[0])
    for (let index = 1; index < expected.length - 1; index++) {
      expect(queue.peek(session, pool, 0).dish.id).toBe(expected[index])
      expect(queue.peek(session, pool, 1).dish.id).toBe(expected[index + 1])
      expect(queue.peek(session, pool, 1).dish.id).toBe(expected[index + 1])
      expect(queue.next(session, pool).dish.id).toBe(expected[index])
    }
  })
  it('shows every eligible dish once before exhaustion, including repeated launches', () => {
    const queue = createSurpriseSession({ random: seeded(42) }), pool = surpriseCandidates(session, ranked)
    expect(pool.length).toBeGreaterThan(10)
    const shown = pool.map(() => queue.next(session, ranked).dish.id)
    expect(new Set(shown).size).toBe(pool.length)
    expect(queue.next(session, ranked).dish.id).not.toBe(shown.at(-1))
  })
  it('uses random ordering instead of the highest-score/static first pick', () => {
    const first = Array.from({ length: 12 }, (_, index) => createSurpriseSession({ random: seeded(index + 1) }).next(session, ranked).dish.id)
    expect(new Set(first).size).toBeGreaterThan(3)
    expect(first.some(id => id !== ranked[0].dish.id)).toBe(true)
  })
  it('respects explicit food/region, quality and at least one selected flavor', () => {
    const selected = { ...session, foodType: 'noodle', region: 'southeast-asia' }, results = recommend(selected, dishes)
    const pool = surpriseCandidates(selected, results)
    expect(pool.length).toBeGreaterThan(2)
    expect(pool.every(({ dish }) => dish.foodType === 'noodle' && dish.region === 'southeast-asia'
      && selected.flavors.some(flavor => dish.preferenceFlavors.includes(flavor)))).toBe(true)
    const high = Math.max(...pool.map(result => result.score))
    expect(pool.every(result => result.score >= Math.max(high / 2, high - 50))).toBe(true)
  })
  it('does not repeat at exhaustion with constant randomness and handles one/zero candidates', () => {
    const pool = ranked.slice(0, 3), queue = createSurpriseSession({ random: () => 0.5 })
    const shown = Array.from({ length: 10 }, () => queue.next(session, pool).dish.id)
    expect(shown.every((id, index) => index === 0 || id !== shown[index - 1])).toBe(true)
    expect(queue.next(session, [])).toBeNull()
    expect(queue.next(session, pool.slice(0, 1)).dish.id).toBe(pool[0].dish.id)
    expect(queue.next(session, pool.slice(0, 1)).dish.id).toBe(pool[0].dish.id)
  })
  it('resets on substantial context changes and normalizes flavor order', () => {
    const queue = createSurpriseSession({ random: () => 0.5 })
    const first = queue.next(session, ranked)
    expect(queue.next({ ...session, flavors: [...session.flavors].reverse() }, ranked).dish.id).not.toBe(first.dish.id)
    const nextSession = { ...session, foodType: 'rice' }
    expect(queue.next(nextSession, recommend(nextSession, dishes)).dish.foodType).toBe('rice')
  })
  it('leaves normal Top Matches, More Options, inputs and scoring deterministic', () => {
    const normal = { ...session, foodType: 'noodle', adventurousness: 'adventurous', region: 'southeast-asia' }
    const before = recommend(normal, dishes), more = selectMoreOptions(normal, before), serialized = JSON.stringify(before)
    const queue = createSurpriseSession()
    for (let index = 0; index < 30; index++) queue.next(normal, before)
    expect(JSON.stringify(before)).toBe(serialized)
    expect(recommend(normal, dishes)).toEqual(before)
    expect(selectMoreOptions(normal, recommend(normal, dishes))).toEqual(more)
  })
})
