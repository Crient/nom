import starIcon from '../../assets/icons/restaurant-preview-star.svg'
import locationIcon from '../../assets/icons/restaurant-preview-location.svg'
import Image from '../ui/Image'

/** A development restaurant preview backed by the same adapter as Nearby. */
export default function RestaurantPreviewCard({ restaurant, onSelect }) {
  return (
    <button type="button" onClick={onSelect} aria-label={`View ${restaurant.name} details`} className="relative min-h-[95px] min-w-0 rounded-sm bg-surface text-left shadow-card">
      <Image loading="lazy"
        src={restaurant.image}
        alt={restaurant.name}
        className="h-[63px] w-full rounded-t-sm object-cover"
        style={restaurant.imagePosition ? { objectPosition: restaurant.imagePosition } : undefined}
      />
      <h3 className="relative -top-[2px] min-h-[14px] px-[5px] text-[8.729px] leading-[12px] font-bold tracking-[0.175px] text-strong-neutral">
        {restaurant.name}
      </h3>
      <div className="flex min-h-[19px] flex-wrap items-center text-[6.547px] leading-[19px] tracking-[0.175px] text-text-secondary">
        <img src={starIcon} alt="" className="ml-[1px] max-w-none" />
        <p><strong>{restaurant.rating}</strong> ({restaurant.reviews})</p>
        <div className="ml-auto mr-[5px] flex items-center">
          <img src={locationIcon} alt="" className="max-w-none" />
          <span className="font-bold">{restaurant.distance}</span>
        </div>
      </div>
    </button>
  )
}
