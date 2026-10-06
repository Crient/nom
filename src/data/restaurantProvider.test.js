import { describe, expect, it } from 'vitest'
import { mockRestaurantProvider, restaurantFavoriteActions, selectRestaurants } from './restaurantProvider'
import { mockRestaurants } from './mockRestaurants'
import { dedupeRestaurants } from '../../shared/nearbyRestaurants.js'

describe('restaurant adapter', () => {
  it('deduplicates IDs before name/address aliases, keeps richer facts and primary provenance', () => {
    const first = { id: 'google:one', placeId: 'one', name: 'Café & Nom', address: '10 Main St., Boston',
      matchType: 'exact-dish-search', approximateDistanceMiles: 2 }
    const richer = { ...first, matchType: 'cuisine-fallback', rating: 4.8, userRatingCount: 42,
      photo: { name: 'places/one/photos/photo' }, approximateDistanceMiles: 3 }
    const alias = { ...first, id: 'google:alias', placeId: 'alias', name: '  CAFE and NOM ', address: '10 Main St Boston', approximateDistanceMiles: 1 }
    const before = JSON.stringify([first, richer, alias])
    expect(dedupeRestaurants([first, richer, alias])).toEqual([expect.objectContaining({ placeId: 'one', rating: 4.8,
      matchType: 'exact-dish-search', matchEvidence: 'exact-search-match' })])
    expect(JSON.stringify([first, richer, alias])).toBe(before)
  })
  it('prefers the closer equally complete alias and preserves separate branches and unknown addresses', () => {
    const venue = { id: 'one', name: 'Nom', address: '10 Main St', approximateDistanceMiles: 3 }
    const closer = { ...venue, id: 'two', approximateDistanceMiles: 1 }
    const branch = { ...venue, id: 'branch', address: '20 Main St' }
    const unknown = [{ id: 'unknown-a', name: 'Nom', address: '' }, { id: 'unknown-b', name: 'Nom', address: '' }]
    expect(selectRestaurants([venue, closer, branch, ...unknown]).map(row => row.id)).toEqual(['two', 'branch', 'unknown-a', 'unknown-b'])
    expect(dedupeRestaurants([{ id: 'saved-a', metadataOnly: true }, { id: 'saved-a', metadataOnly: true }, { id: 'saved-b', metadataOnly: true }])).toHaveLength(2)
  })
  it('handles missing distances, legacy distance and mixed canonical IDs without losing valid evidence', () => {
    const fallback = { id: 'google:a', name: 'Nom', address: '10 Main St', matchType: 'cuisine-fallback', tag: 'fallback' }
    const primary = { ...fallback, placeId: 'a', matchType: 'exact-dish-search', tag: 'primary' }
    expect(dedupeRestaurants([fallback, primary])).toEqual([expect.objectContaining({ tag: 'primary' })])
    expect(dedupeRestaurants([{ ...fallback, distance: 4 }, { ...primary, distance: 2 }])[0].distance).toBe(2)
    const confirmed = { ...fallback, rating: 4.6, matchEvidence: 'confirmed-menu-item' }
    expect(dedupeRestaurants([primary, confirmed])[0].matchEvidence).toBe('confirmed-menu-item')
    expect(dedupeRestaurants([{ id: 'a' }, { id: 'a', name: 'Nom' }])[0].name).toBe('Nom')
  })
  it('retains known aliases but does not transfer match provenance to a different dish', () => {
    const primary = { id: 'google:a', dishId: 'lort-cha', name: 'Nom', address: '10 Main St', matchType: 'exact-dish-search', matchEvidence: 'exact-search-match' }
    const richer = { id: 'google:b', dishId: 'arepa', name: 'Nom', address: '10 Main St', rating: 4.5,
      matchType: 'cuisine-fallback', matchEvidence: 'cuisine-fallback' }
    expect(dedupeRestaurants([primary, richer])[0]).toMatchObject({ dishId: 'arepa', matchType: 'cuisine-fallback',
      matchEvidence: 'cuisine-fallback', aliasIds: ['google:a', 'google:b'] })
    expect(dedupeRestaurants([primary, { ...richer, dishId: 'lort-cha' }])[0].matchType).toBe('exact-dish-search')
    expect(dedupeRestaurants([primary, { ...richer, dishId: undefined }])[0].matchType).toBe('cuisine-fallback')
  })
  it('recognizes saved aliases and removes them together while saving only the chosen identity', () => {
    const restaurant = { id: 'google:b', source: 'google-places', aliasIds: ['google:a', 'google:b'] }, toggled = []
    const favorite = restaurantFavoriteActions(restaurant, { isRestaurantFavorite: id => ['google:a', 'google:b'].includes(id), toggleRestaurantFavorite: id => toggled.push(id) })
    expect(favorite.liked).toBe(true); favorite.toggle(); expect(toggled).toEqual(['google:b', 'google:a'])
    const save = restaurantFavoriteActions(restaurant, { isRestaurantFavorite: () => false, toggleRestaurantFavorite: id => toggled.push(id) })
    expect(save.liked).toBe(false); save.toggle(); expect(toggled.at(-1)).toBe('google:b')
  })
  it('sorts both rating directions with missing ratings last and closest ties first', () => {
    const rows = [{ id: 'far-high', rating: 5, distance: 20 }, { id: 'unrated', rating: null, distance: 1 },
      { id: 'near-high', rating: 5, distance: 2 }, { id: 'low', rating: 3, distance: 3 }]
    expect(selectRestaurants(rows, { sort: 'rating' }).map(row => row.id)).toEqual(['near-high', 'far-high', 'low', 'unrated'])
    expect(selectRestaurants(rows, { sort: 'rating-ascending' }).map(row => row.id)).toEqual(['low', 'near-high', 'far-high', 'unrated'])
  })
  it('returns only fixtures for the requested dish, with explicit mock provenance', async () => {
    const data = await mockRestaurantProvider.findByDish({ dishId: 'lort-cha' })
    expect(data.source).toBe('mock')
    expect(data.restaurants).toHaveLength(6)
    expect(data.restaurants.every(restaurant => restaurant.dishId === 'lort-cha')).toBe(true)
    expect(new Set(data.restaurants.map(restaurant => restaurant.id)).size).toBe(6)
    expect((await mockRestaurantProvider.findByDish({ dishId: 'arepa' })).restaurants).toEqual([])
    const moreOptions = await mockRestaurantProvider.findByDish({ dishId: 'num-banh-chok' })
    expect(moreOptions.restaurants).toHaveLength(6)
    expect(moreOptions.restaurants.every(restaurant => restaurant.dishId === 'num-banh-chok')).toBe(true)
    expect((await mockRestaurantProvider.getById({ dishId: 'num-banh-chok', restaurantId: 'preview-thmor-da' })).restaurant.dishId).toBe('num-banh-chok')
    expect((await mockRestaurantProvider.getById({ dishId: 'arepa', restaurantId: 'preview-thmor-da' })).restaurant).toBeNull()
  })
  it('respects cancellation', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(mockRestaurantProvider.findByDish({ dishId: 'lort-cha', signal: controller.signal })).rejects.toThrow()
  })
  it('sorts deterministically, preserves ties and source order, and applies all controls', () => {
    const before = JSON.stringify(mockRestaurants)
    const closest = selectRestaurants(mockRestaurants)
    expect(closest.map(restaurant => restaurant.distance)).toEqual([1.2, 1.8, 16, 16.1, 17, 17])
    expect(closest.slice(-2).map(restaurant => restaurant.id)).toEqual(['preview-phnom-penh', 'preview-lowell'])
    expect(selectRestaurants(mockRestaurants, { sort: 'rating' })[0].rating).toBe(4.7)
    expect(selectRestaurants(mockRestaurants, { rating: 4.5, price: 2, openOnly: true })).toHaveLength(3)
    expect(selectRestaurants(mockRestaurants, { price: 1 })).toEqual([])
    expect(JSON.stringify(mockRestaurants)).toBe(before)
  })
})
