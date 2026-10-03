import { useState } from 'react'
import HeartButton from '../recommendations/HeartButton'
import DishTag from '../recommendations/DishTag'
import Image from '../ui/Image'
import { useFavorites } from '../../context/Favorites'
import placeholder from '../../assets/food/dish-placeholder.svg'
import star from '../../assets/icons/restaurant-preview-star.svg'

export default function RestaurantCard({ restaurant, dish, selected = false, onSelect, actionLabel }) {
  const { isRestaurantFavorite, toggleRestaurantFavorite } = useFavorites()
  const [failedImage, setFailedImage] = useState(null)
  const image = restaurant.image && failedImage !== restaurant.image ? restaurant.image : placeholder
  return (
    <article className={`restaurant-card ${selected ? 'restaurant-card-selected' : ''}`} aria-label={restaurant.name}>
      <button type="button" className="restaurant-select" aria-label={actionLabel ?? `Show ${restaurant.name} on map`} onClick={onSelect}>
        <Image src={image} alt={restaurant.name} loading="lazy" width={120} height={94}
          onError={() => setFailedImage(restaurant.image)}
          className="restaurant-photo" style={{ objectPosition: restaurant.imagePosition }} />
        <span className="restaurant-copy">
          <span className="restaurant-name">{restaurant.name}</span>
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
        </span>
      </button>
      <HeartButton dishName={restaurant.name} liked={isRestaurantFavorite(restaurant.id)}
        onToggle={() => toggleRestaurantFavorite(restaurant.id)} size={24} className="top-[8px] right-[8px]" />
    </article>
  )
}
