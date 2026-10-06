/** A native full-card button leaves author/source links and favorites independently usable. */
export function restaurantCardClick(onSelect) {
  return event => { if (!event.target.closest('a,button,input,select,textarea') && onSelect) onSelect() }
}

export default function RestaurantCardOpen({ onSelect, label }) {
  return onSelect ? <button type="button" className="restaurant-card-open" aria-label={label}
    onClick={event => { event.stopPropagation(); onSelect() }} /> : null
}
