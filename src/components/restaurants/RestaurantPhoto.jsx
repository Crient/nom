import { useState } from 'react'
import Image from '../ui/Image'
import placeholder from '../../assets/food/dish-placeholder.svg'

export default function RestaurantPhoto({ src, alt, cropped = false, className = '' }) {
  const [failed, setFailed] = useState(null)
  const image = src && failed !== src ? src : placeholder
  return <div className={`restaurant-hero-photo ${className}`}>
    <Image src={image} alt={alt} onError={() => setFailed(src)}
      className={cropped && image !== placeholder ? 'restaurant-storefront-crop' : ''} />
  </div>
}
