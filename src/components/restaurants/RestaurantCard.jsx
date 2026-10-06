import { useState } from 'react'
import HeartButton from '../recommendations/HeartButton'
import DishTag from '../recommendations/DishTag'
import Image from '../ui/Image'
import { useFavorites } from '../../context/Favorites'
import { restaurantFavoriteActions } from '../../data/restaurantProvider'
import placeholder from '../../assets/food/dish-placeholder.svg'
import star from '../../assets/icons/restaurant-preview-star.svg'
import RestaurantFacts, { restaurantMatchLabel } from './RestaurantFacts'
import { safeMapsUri } from '../../../shared/nearbyRestaurants.js'
import PlacePhoto from './PlacePhoto'
import RestaurantCardOpen, { restaurantCardClick } from './RestaurantCardOpen'

export default function RestaurantCard({ restaurant, dish, selected = false, onSelect, actionLabel, showPhoto = true, eagerPhoto = false, number }) {
  const favorite = restaurantFavoriteActions(restaurant, useFavorites())
  const [failedImage, setFailedImage] = useState(null)
  const image = restaurant.image && failedImage !== restaurant.image ? restaurant.image : placeholder
  if (['google-places', 'legacy-preview'].includes(restaurant.source)) return (
    <article className={`restaurant-card restaurant-card-live ${selected ? 'restaurant-card-selected' : ''}`} aria-label={restaurant.name} onClick={restaurantCardClick(onSelect)}>
      <RestaurantCardOpen onSelect={onSelect} label={actionLabel ?? `View ${restaurant.name} details`} />
      {number && <span className="restaurant-list-number" aria-label={`Map pin ${number}`}>{number}</span>}
      {showPhoto && restaurant.source === 'google-places' && <PlacePhoto restaurant={restaurant} eager={eagerPhoto} />}
      <div className="restaurant-copy">
        <div className="restaurant-favorite-row"><h3 className="restaurant-name">{restaurant.name}</h3>
          <HeartButton dishName={restaurant.name} liked={favorite.liked} onToggle={favorite.toggle} size={18} className="restaurant-list-heart" /></div>
        <RestaurantFacts restaurant={restaurant} />
        <span className="restaurant-meta restaurant-match">{restaurantMatchLabel(restaurant, dish)}</span>
        {safeMapsUri(restaurant.googleMapsUri) && <a href={restaurant.googleMapsUri} className="restaurant-maps-link" target="_blank" rel="noopener noreferrer"
          aria-label={`View ${restaurant.name} on Google Maps`} title="Open on Google Maps"><span aria-hidden="true">↗</span></a>}
      </div>
    </article>
  )
  return (
    <article className={`restaurant-card ${selected ? 'restaurant-card-selected' : ''}`} aria-label={restaurant.name} onClick={restaurantCardClick(onSelect)}>
      <RestaurantCardOpen onSelect={onSelect} label={actionLabel ?? `Show ${restaurant.name} on map`} />
      <div className="restaurant-select">
        <Image src={image} alt={restaurant.name} loading="lazy" width={120} height={94}
          onError={() => setFailedImage(restaurant.image)}
          className="restaurant-photo" style={{ objectPosition: restaurant.imagePosition }} />
        <div className="restaurant-copy">
          <div className="restaurant-favorite-row"><h3 className="restaurant-name">{restaurant.name}</h3>
            <HeartButton dishName={restaurant.name} liked={favorite.liked} onToggle={favorite.toggle} size={18} className="restaurant-list-heart" /></div>
          <span className="restaurant-meta">{restaurant.distance} mi • {restaurant.address} • {'$'.repeat(restaurant.priceLevel)}</span>
          <span className="restaurant-meta restaurant-rating">
            <img src={star} alt="" width={15} height={15} />
            <strong>{restaurant.rating}</strong> ({restaurant.reviewCount}) •
            <span className={restaurant.isOpen ? 'text-accessible-teal' : 'text-error'}>{restaurant.isOpen ? 'Open' : 'Closed'}</span>
          </span>
          {restaurant.reviewExcerpt && <span className="restaurant-excerpt">“{restaurant.reviewExcerpt}”</span>}
          <span className="restaurant-tags">
            {[dish.name, ...(restaurant.tags ?? [])].map(tag => <DishTag key={tag} label={tag} size="compact" />)}
          </span>
        </div>
      </div>
    </article>
  )
}
