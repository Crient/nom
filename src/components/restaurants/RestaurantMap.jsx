import mapImage from '../../assets/nearby/map.webp'
import Image from '../ui/Image'
import locateIcon from '../../assets/nearby/locate.webp'

/** The exported Figma image is a static illustration, including its printed labels.
 * Interactive numbered markers come exclusively from the provider's mock positions.
 * Replace this renderer together with the provider when adding a live map.
 */
export default function RestaurantMap({ restaurants, selectedId, onSelect }) {
  const nearest = restaurants.reduce((best, restaurant) =>
    !best || restaurant.distance < best.distance ? restaurant : best, null)
  return (
    <section className="restaurant-map" aria-label="Restaurant map preview">
      <Image src={mapImage} alt="Static Boston-area map preview from the Nom design" width={400} height={498} className="size-full object-cover" />
      <span className="map-preview-label">Map preview</span>
      <button type="button" aria-label="Show closest restaurant" className="map-locate" onClick={() => nearest && onSelect(nearest.id)}>
        <Image src={locateIcon} alt="" width={55} height={55} className="size-full object-contain" />
      </button>
      {restaurants.filter(restaurant => restaurant.mapPosition).map((restaurant, index) => (
        <button key={restaurant.id} type="button" aria-label={`Select ${restaurant.name}`} aria-pressed={restaurant.id === selectedId}
          className={`restaurant-pin ${restaurant.id === selectedId ? 'restaurant-pin-selected' : ''}`}
          style={{ left: `${restaurant.mapPosition.x}%`, top: `${restaurant.mapPosition.y}%` }}
          onClick={() => onSelect(restaurant.id)}>
          <span>{index + 1}</span>
        </button>
      ))}
    </section>
  )
}
