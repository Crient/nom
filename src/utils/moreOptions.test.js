import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import taxonomy from '../data/catalog/taxonomy.json'
import { recommend, selectMoreOptions, MORE_OPTIONS_MIN_SCORE } from './recommendationEngine'

const base = { foodType: 'noodle', flavors: ['comforting', 'spicy'], adventurousness: 'adventurous', region: 'latin-america' }
const ids = results => results.map(result => result.dish.id)

describe('More Options regional presentation', () => {
  it('shows all five relevant unused Latin American dishes before stronger cross-region matches', () => {
    const results = recommend(base, dishes), more = selectMoreOptions(base, results)
    expect(more.map(result => [result.dish.id, result.score])).toEqual([
      ['feijoada', 42], ['arroz-chaufa', 42], ['aji-de-gallina', 42],
      ['jerk-chicken', 42], ['mofongo', 42], ['lort-cha', 70], ['reshteh-polow', 70],
    ])
    expect(ids(results.slice(0, 3))).toEqual(['sopa-de-fideo', 'tallarines-verdes', 'locro'])
  })

  it.each(taxonomy.regions)('preserves scores and deterministic tie order within the %s and cross-region groups', region => {
    const session = { ...base, region }, results = recommend(session, dishes)
    const snapshot = results.map(result => [result.dish.id, result.score])
    const more = selectMoreOptions(session, results)
    const remaining = results.slice(3)
    const regional = remaining.filter(result => result.dish.region === region && result.score >= MORE_OPTIONS_MIN_SCORE)
    const cross = remaining.filter(result => result.dish.region !== region && result.score >= MORE_OPTIONS_MIN_SCORE)
    expect(more).toEqual([...regional, ...cross].slice(0, 7))
    expect(more).toEqual(selectMoreOptions(session, results))
    expect(more.every(result => remaining.includes(result))).toBe(true)
    expect(new Set(ids(more)).size).toBe(more.length)
    expect(more.some(result => results.slice(0, 3).includes(result))).toBe(false)
    expect(results.map(result => [result.dish.id, result.score])).toEqual(snapshot)
    expect(recommend(session, dishes)).toEqual(results)
  })

  it('includes the relevance boundary, excludes weak candidates and labels no region as a match by score alone', () => {
    const fixture = (id, region, score) => ({ dish: { id, region }, score })
    const top = [fixture('top-a', base.region, 90), fixture('top-b', base.region, 80), fixture('top-c', base.region, 70)]
    const strong = fixture('global', 'east-asia', 85)
    const boundary = fixture('regional-boundary', base.region, 40)
    const weak = fixture('regional-weak', base.region, 39)
    const irrelevantCross = fixture('cross-weak', 'europe', 39)
    expect(selectMoreOptions(base, [...top, strong, boundary, weak, irrelevantCross])).toEqual([boundary, strong])
    expect(selectMoreOptions(base, [...top, strong, weak])).toEqual([strong])
    expect(selectMoreOptions(base, [...top, weak, irrelevantCross])).toEqual([])
  })

  it.each([null, 'surprise-me'])('retains the exact global slice and tie policy with region %s', region => {
    const session = { ...base, region }, results = recommend(session, dishes)
    expect(selectMoreOptions(session, results)).toEqual(results.slice(3, 10))
    const weak = results.map(result => ({ ...result, score: 10 }))
    expect(selectMoreOptions(session, weak)).toEqual(weak.slice(3, 10))
  })

  it('also prioritizes explicit-region More Options for Anything without changing its Top Matches', () => {
    const session = { ...base, foodType: 'anything' }, results = recommend(session, dishes)
    const top = results.slice(0, 3)
    const more = selectMoreOptions(session, results)
    expect(more.every(result => result.dish.region === session.region)).toBe(true)
    expect(results.slice(0, 3)).toEqual(top)
  })
})
