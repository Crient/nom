import { mockRestaurants } from './mockRestaurants'

/**
 * Temporary visual fixtures from Figma 263:4426, scoped to its Lort Cha example.
 * Ratings/distances are design-preview copy, not live location or availability data.
 * Never feed these into the dish catalog or recommendation engine.
 */
export const dishDetailsRestaurantDesignPreview = {
  dishId: 'lort-cha',
  restaurants: mockRestaurants.slice(0, 3).map(restaurant => ({
    ...restaurant, reviews: restaurant.reviewCount, distance: `${restaurant.distance} mi`,
  })),
}
