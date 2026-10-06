import dishLortCha from '../assets/food/dish-lort-cha.webp'
import dishMieGoreng from '../assets/food/dish-mie-goreng.webp'
import dishPancitCanton from '../assets/food/dish-pancit-canton.webp'
import dishCharKwayTeow from '../assets/food/dish-char-kway-teow.webp'
import dishMiQuang from '../assets/food/dish-mi-quang.webp'
import dishHokkienMee from '../assets/food/dish-hokkien-mee.webp'
import dishKoloMee from '../assets/food/dish-kolo-mee.webp'
import dishPancitBihon from '../assets/food/dish-pancit-bihon.webp'
import dishCaoLau from '../assets/food/dish-cao-lau.webp'
import dishNumBanhChok from '../assets/food/dish-num-banh-chok.webp'

import { catalogDishImages, dishImageReview } from './dishImageAssets'

export const existingDishImages = {
  'lort-cha': dishLortCha,
  'mie-goreng': dishMieGoreng,
  'pancit-canton': dishPancitCanton,
  'char-kway-teow': dishCharKwayTeow,
  'mi-quang': dishMiQuang,
  'hokkien-mee': dishHokkienMee,
  'kolo-mee': dishKoloMee,
  'pancit-bihon': dishPancitBihon,
  'cao-lau': dishCaoLau,
  'num-banh-chok': dishNumBanhChok,
}


// Original files remain available for review. Only explicit approvals/temporary
// decisions render, and a generated replacement must not be overridden by an old original.
const reviewedOriginals = Object.fromEntries(Object.entries(existingDishImages).filter(([id]) => {
  const review = dishImageReview[id]
  return review?.storageStatus === 'existing-local' && ['approved', 'temporary'].includes(review.reviewStatus)
}))
export const dishImages = { ...catalogDishImages, ...reviewedOriginals }
export { dishImageReview }
