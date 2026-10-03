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

import { licensedDishImages } from './dishImageAssets'

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


// Preserve existing good photos even if a future manifest accidentally repeats an ID.
export const dishImages = { ...licensedDishImages, ...existingDishImages }
export { licensedDishImages }
