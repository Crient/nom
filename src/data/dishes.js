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

import records from './catalog/records.json'
import dishPlaceholder from '../assets/food/dish-placeholder.svg'

// Images are replaceable independently of canonical records and scoring.
// Only actual local assets belong here; workbook search pages are references.
export const dishImages = {
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

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const flagFor = code => [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('')

/** All Dishes rows, unfiltered and in source order for deterministic engine ties. */
export const dishes = records.map(record => ({
  ...record,
  country: countryNames.of(record.countryCode),
  flag: flagFor(record.countryCode),
  image: dishImages[record.id] ?? dishPlaceholder,
  imageStatus: dishImages[record.id] ? 'existing-local' : 'placeholder',
}))
