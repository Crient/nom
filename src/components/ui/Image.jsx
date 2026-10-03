import { useState } from 'react'
import { imageDimensions } from '../../data/imageDimensions'
import placeholder from '../../assets/food/dish-placeholder.svg'

/** Runtime raster images carry their real intrinsic size, even inside cropped slots. */
export default function Image({ src, alt, onError, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const image = src && failedSrc !== src ? src : placeholder
  return <img src={image} alt={alt} {...imageDimensions[image]} decoding="async" {...props} onError={event => {
    setFailedSrc(src)
    onError?.(event)
  }} />
}
