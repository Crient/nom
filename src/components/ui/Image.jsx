import { imageDimensions } from '../../data/imageDimensions'

/** Runtime raster images carry their real intrinsic size, even inside cropped slots. */
export default function Image({ src, alt, ...props }) {
  return <img src={src} alt={alt} {...imageDimensions[src]} decoding="async" {...props} />
}
