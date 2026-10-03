import starIcon from '../../assets/icons/restaurant-preview-star.svg'
import locationIcon from '../../assets/icons/restaurant-preview-location.svg'

/** A non-interactive restaurant design fixture, never a live nearby result. */
export default function RestaurantPreviewCard({ restaurant }) {
  return (
    <article className="relative h-[95px] w-[121px] shrink-0 rounded-sm bg-surface shadow-card">
      <img
        src={restaurant.image}
        alt={restaurant.name}
        className="h-[63px] w-full rounded-t-sm object-cover"
        style={restaurant.imagePosition ? { objectPosition: restaurant.imagePosition } : undefined}
      />
      <h3 className="relative -top-[2px] h-[14px] px-[5px] text-[8.729px] leading-[19px] font-bold tracking-[0.175px] whitespace-nowrap text-strong-neutral">
        {restaurant.name}
      </h3>
      <div className="flex h-[19px] items-center text-[6.547px] leading-[19px] tracking-[0.175px] text-text-secondary">
        <img src={starIcon} alt="" className="ml-[1px] max-w-none" />
        <p><strong>{restaurant.rating}</strong> ({restaurant.reviews})</p>
        <div className="ml-auto mr-[5px] flex items-center">
          <img src={locationIcon} alt="" className="max-w-none" />
          <span className="font-bold">{restaurant.distance}</span>
        </div>
      </div>
    </article>
  )
}
