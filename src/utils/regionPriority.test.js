import { describe, expect, it } from 'vitest'
import { dishes } from '../data/dishes'
import { recommend, scoreDish, REGION_PRIORITY_MIN_SCORE } from './recommendationEngine'

const base = { foodType: 'noodle', flavors: ['comforting', 'spicy'], adventurousness: 'adventurous' }
const ids = results => results.map(result => result.dish.id)
const globalOrder = (session, catalog = dishes) => catalog.map(dish => scoreDish(session, dish)).sort((a, b) => b.score - a.score)

describe('explicit region candidate tiers', () => {
  it.each([
    ['east-asia', ['dandan-noodles', 'zhajiangmian', 'jjajangmyeon']],
    ['southeast-asia', ['lort-cha', 'mie-goreng', 'pancit-canton']],
    ['south-asia', ['dal-dhokli', 'idiyappam', 'thukpa']],
    ['middle-east', ['reshteh-polow', 'manti', 'ash-reshteh']],
    ['africa', ['rechta', 'baasto-iyo-suugo', 'doro-wat']],
    ['europe', ['spaetzle', 'carbonara', 'cacio-e-pepe']],
    ['latin-america', ['sopa-de-fideo', 'tallarines-verdes', 'locro']],
    ['north-america', ['saimin', 'macaroni-and-cheese', 'baked-ziti']],
  ])('constrains Top 3 to %s while preserving percentages and the global More Options order', (region, top) => {
    const session = { ...base, region }, results = recommend(session, dishes)
    expect(ids(results.slice(0, 3))).toEqual(top)
    expect(results.slice(0, 3).every(result => result.dish.region === region)).toBe(true)
    expect(results).toEqual(recommend(session, dishes))
    expect(new Set(ids(results)).size).toBe(201)
    for (const result of results) expect(result.score).toBe(scoreDish(session, result.dish).score)
    expect(ids(results.slice(3))).toEqual(ids(globalOrder(session).filter(result => !top.includes(result.dish.id))))
    const matching = dishes.filter(dish => dish.region === region && dish.foodType === base.foodType)
    expect(results.slice(0, Math.min(3, matching.length)).every(result => result.dish.foodType === base.foodType)).toBe(true)
  })

  it.each(['east-asia', 'southeast-asia', 'south-asia', 'middle-east', 'africa', 'europe', 'latin-america', 'north-america'])('retains the previous Anything policy for %s', region => {
    const session = { foodType: 'anything', flavors: ['comforting'], adventurousness: 'different', region }
    const global = globalOrder(session)
    const promoted = global.filter(result => result.dish.region === region && result.score >= REGION_PRIORITY_MIN_SCORE).slice(0, 3)
    expect(ids(recommend(session, dishes))).toEqual(ids([...promoted, ...global.filter(result => !ids(promoted).includes(result.dish.id))]))
  })

  it('uses three food-type candidates even when all score below the old threshold, preserving tier ties', () => {
    const template = dishes.find(dish => dish.id === 'tallarines-verdes')
    const candidates = ['first', 'second', 'third'].map(id => ({ ...template, id, preferenceFlavors: ['fresh'], adventureLevel: 1 }))
    const session = { ...base, region: 'latin-america' }
    const highRegional = { ...template, id: 'high-regional', foodType: 'rice', preferenceFlavors: base.flavors, adventureLevel: 3 }
    const foreign = dishes.find(dish => dish.id === 'lort-cha')
    const results = recommend(session, [foreign, highRegional, ...candidates])
    expect(ids(results.slice(0, 3))).toEqual(['first', 'second', 'third'])
    expect(results[0].score).toBeLessThan(70)
    expect(results[0].score).toBeLessThan(scoreDish(session, highRegional).score)
  })

  it('uses regional non-food-type candidates before higher-scoring global backfill', () => {
    const session = { ...base, region: 'latin-america' }
    const fixture = ['lort-cha', 'locro', 'tallarines-verdes', 'feijoada'].map(id => dishes.find(dish => dish.id === id))
    expect(ids(recommend(session, fixture))).toEqual(['tallarines-verdes', 'locro', 'feijoada', 'lort-cha'])
    expect(ids(recommend(session, fixture.filter(dish => dish.id !== 'feijoada')))).toEqual(['tallarines-verdes', 'locro', 'lort-cha'])
    expect(ids(recommend(session, fixture.filter(dish => dish.region !== session.region)))).toEqual(['lort-cha'])
  })

  it.each([null, 'surprise-me'])('preserves neutral weighted ordering and tie behavior with region %s', region => {
    const session = { foodType: 'grilled-protein', flavors: ['comforting'], adventurousness: 'different', region }
    const fixture = ['yakitori', 'bulgogi', 'lomo-saltado', 'ceviche'].map(id => dishes.find(dish => dish.id === id))
    expect(ids(recommend(session, fixture))).toEqual(['yakitori', 'bulgogi', 'lomo-saltado', 'ceviche'])
    expect(recommend(session, fixture)).toEqual(recommend(session, fixture))
  })
})
