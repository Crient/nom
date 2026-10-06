import { useEffect, useRef, useState } from 'react'
import LiveRestaurantMap from './LiveRestaurantMap'
import Button from '../ui/Button'
import { validCoordinates } from '../../../shared/nearbyRestaurants.js'

export default function RestaurantLocationPreview({ restaurant }) {
  const section = useRef(null), [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!globalThis.IntersectionObserver) return
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() } }, { rootMargin: '100px' })
    observer.observe(section.current); return () => observer.disconnect()
  }, [])
  return <section ref={section} className="restaurant-location-preview" aria-labelledby="restaurant-location-title">
    <h2 id="restaurant-location-title">Location</h2>
    {validCoordinates(restaurant) ? visible ? <LiveRestaurantMap restaurants={[restaurant]} selectedId={restaurant.id} onSelect={() => {}}
      active compact sessionKey={`restaurant:${restaurant.placeId}`} /> : <div className="restaurant-map-preview-placeholder"><Button variant="secondary" onClick={() => setVisible(true)}>Show location map</Button></div>
      : <p>Open Directions to view this restaurant’s location.</p>}
    {restaurant.address && <p className="restaurant-location-address">{restaurant.address}</p>}
  </section>
}
