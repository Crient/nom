import { openingLabel, nearbyDistanceBand } from '../../../shared/nearbyRestaurants.js'

export function restaurantMatchLabel(restaurant, dish) {
  if (restaurant.source === 'legacy-preview') return 'Saved preview; not a live restaurant result'
  if (restaurant.metadataOnly) return 'Saved search result; refresh for current details'
  return restaurant.matchType === 'cuisine-fallback' ? `${restaurant.cuisine} restaurant nearby`
    : `Matched for ${dish?.name ?? 'your dish'}`
}

export default function RestaurantFacts({ restaurant, compact = false }) {
  const distance = restaurant.approximateDistanceMiles, hours = openingLabel(restaurant)
  return <>
    {!compact && restaurant.address && <span className="restaurant-meta restaurant-address" title={restaurant.address}>{restaurant.address}</span>}
    <span className="restaurant-facts-row">
      {typeof restaurant.rating === 'number' && <span className="restaurant-meta restaurant-rating">
        <span aria-label={`${restaurant.rating.toFixed(1)} out of 5 stars`}><span className="restaurant-rating-star" aria-hidden="true">★</span> {restaurant.rating.toFixed(1)}</span>
        {Number.isInteger(restaurant.userRatingCount) && <span>({restaurant.userRatingCount.toLocaleString('en-US')}{!compact && <span className="sr-only"> ratings</span>})</span>}
      </span>}
      {Number.isFinite(distance) && <span className="restaurant-meta restaurant-distance">~{distance.toFixed(1)} mi <span className="sr-only">approximate straight-line distance</span></span>}
      {hours && <span className={`restaurant-meta restaurant-opening ${hours === 'Open now' ? 'restaurant-opening-open' : ''}`}>{hours}</span>}
      {distance > 50 && <span className="restaurant-distance-band">{nearbyDistanceBand(distance)}</span>}
    </span>
  </>
}
