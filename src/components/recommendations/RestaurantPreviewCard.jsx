import starIcon from '../../assets/icons/restaurant-preview-star.svg'
import locationIcon from '../../assets/icons/restaurant-preview-location.svg'
import Image from '../ui/Image'
import RestaurantFacts, { restaurantMatchLabel } from '../restaurants/RestaurantFacts'
import PlacePhoto from '../restaurants/PlacePhoto'
import RestaurantCardOpen, { restaurantCardClick } from '../restaurants/RestaurantCardOpen'
import HeartButton from './HeartButton'
import { useFavorites } from '../../context/Favorites'
import { restaurantFavoriteActions } from '../../data/restaurantProvider'

/** Compact Nom venue cards backed by the shared nearby results. */
export default function RestaurantPreviewCard({ restaurant, dish, onSelect }) {
  const favorite = restaurantFavoriteActions(restaurant, useFavorites())
  if (restaurant.source === 'google-places') return <article className="restaurant-preview-live" onClick={restaurantCardClick(onSelect)}>
    <RestaurantCardOpen onSelect={onSelect} label={`View ${restaurant.name} details`} />
    <PlacePhoto restaurant={restaurant} compact />
    <div className="restaurant-preview-copy"><div className="restaurant-favorite-row"><h3 className="restaurant-preview-title">{restaurant.name}</h3>
      <HeartButton dishName={restaurant.name} liked={favorite.liked} onToggle={favorite.toggle} size={18} className="restaurant-preview-heart" /></div>
      <RestaurantFacts restaurant={restaurant} compact />
      <p className="restaurant-meta restaurant-match">{restaurantMatchLabel(restaurant, dish)}</p>
    </div>
  </article>
  return (
    <article className="restaurant-preview-live" onClick={restaurantCardClick(onSelect)}>
      <RestaurantCardOpen onSelect={onSelect} label={`View ${restaurant.name} details`} />
      <Image loading="lazy" src={restaurant.image} alt={restaurant.name}
        className="restaurant-preview-photo" style={{ objectPosition: restaurant.imagePosition }} />
      <div className="restaurant-preview-copy">
        <div className="restaurant-favorite-row"><h3 className="restaurant-preview-title">{restaurant.name}</h3>
          <HeartButton dishName={restaurant.name} liked={favorite.liked} onToggle={favorite.toggle} size={18} className="restaurant-preview-heart" /></div>
        <div className="restaurant-facts-row"><span className="restaurant-meta restaurant-rating"><img src={starIcon} alt="" width={15} height={15} /><strong>{restaurant.rating}</strong> ({restaurant.reviews ?? restaurant.reviewCount})</span>
          <span className="restaurant-meta restaurant-distance"><img src={locationIcon} alt="" width={12} height={12} />{restaurant.distance}</span></div>
      </div>
    </article>
  )
}
