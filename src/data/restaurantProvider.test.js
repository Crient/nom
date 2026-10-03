import { describe, expect, it } from 'vitest'
import { mockRestaurantProvider, selectRestaurants } from './restaurantProvider'
import { mockRestaurants } from './mockRestaurants'

describe('restaurant adapter', () => {
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
