import { mockRestaurants } from './mockRestaurants'
import { restaurantServesDish } from './mockRestaurantMenus'

/** Explicit tests/design demos only; the production provider never selects this. */
export const mockRestaurantProvider = {
  async getById({ restaurantId, dishId, signal }) {
    signal?.throwIfAborted()
    const restaurant = mockRestaurants.find(item => item.id === restaurantId && restaurantServesDish(item, dishId)) ?? null
    return { restaurant: restaurant ? { ...restaurant, dishId } : null, source: 'mock' }
  },
  async findByDish({ dishId, signal }) {
    signal?.throwIfAborted()
    return { restaurants: mockRestaurants.filter(restaurant => restaurantServesDish(restaurant, dishId)).map(restaurant => ({ ...restaurant, dishId })),
      source: 'mock', notice: 'Development preview. Menus, distances, ratings, and opening hours are examples.' }
  },
}
