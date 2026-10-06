import records from './catalog/records.json'
import dishPlaceholder from '../assets/food/dish-placeholder.svg'

import { dishImages, dishImageReview } from './dishImages'
export { dishImages }

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const flagFor = code => [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('')

/** All Dishes rows, unfiltered and in source order for deterministic engine ties. */
export const dishes = records.map(record => ({
  ...record,
  country: countryNames.of(record.countryCode),
  flag: flagFor(record.countryCode),
  image: dishImages[record.id] ?? dishPlaceholder,
  imageStatus: dishImages[record.id] ? dishImageReview[record.id].storageStatus : 'placeholder',
}))
