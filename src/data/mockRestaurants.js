import thmorDa from '../assets/restaurants/preview-thmor-da.webp'
import goldenMonkey from '../assets/restaurants/preview-golden-monkey.webp'
import peephuptmei from '../assets/restaurants/preview-peephuptmei.webp'
import redRose from '../assets/nearby/red-rose.webp'
import lowell from '../assets/nearby/lowell.webp'
import phnomPenh from '../assets/nearby/phnom-penh.webp'

/** Figma development examples, NOT verified menus, addresses, or live availability.
 * distance is miles; mapPosition is a percentage on the static Figma preview.
 * The mock adapter also supports the explicitly declared Cambodian demo menus.
 * Other dishes return an empty development result rather than a fabricated match.
 */
export const mockRestaurants = [
  { id: 'preview-thmor-da', name: 'THMOR DA Restaurant', dishId: 'lort-cha', distance: 1.2, rating: 4.6, reviewCount: 269, priceLevel: 2, address: 'Revere, MA', isOpen: true, image: thmorDa, imagePosition: 'center 33.3%', cuisine: 'Cambodian', tags: ['Authentic', 'Casual'], reviewExcerpt: 'The Lort cha is a must try!', mapPosition: { x: 50, y: 59 } },
  { id: 'preview-golden-monkey', name: 'The Golden Monkey Cafe', dishId: 'lort-cha', distance: 1.8, rating: 4.7, reviewCount: 142, priceLevel: 2, address: 'Lynn, MA', isOpen: true, image: goldenMonkey, cuisine: 'Cambodian', tags: ['Amok', 'Casual'], reviewExcerpt: 'Great food and atmosphere', mapPosition: { x: 74, y: 33 } },
  { id: 'preview-peephuptmei', name: 'Peephuptmei Restaurant', dishId: 'lort-cha', distance: 16, rating: 4.2, reviewCount: 271, priceLevel: 2, address: 'Lowell, MA', isOpen: true, image: peephuptmei, cuisine: 'Cambodian', tags: ['Grilled Beef', 'Casual'], reviewExcerpt: 'Reminds me of food from home', mapPosition: { x: 24, y: 17 } },
  { id: 'preview-phnom-penh', name: 'Phnom Penh Restaurant', dishId: 'lort-cha', distance: 17, rating: 4.5, reviewCount: 209, priceLevel: 2, address: 'Lowell, MA', isOpen: true, image: phnomPenh, cuisine: 'Cambodian', tags: ['Family Owned', 'Casual'], reviewExcerpt: 'Delicious beef stick', mapPosition: { x: 12, y: 8 } },
  { id: 'preview-red-rose', name: 'Red Rose Restaurant', dishId: 'lort-cha', distance: 16.1, rating: 4.2, reviewCount: 486, priceLevel: 2, address: 'Lowell, MA', isOpen: true, image: redRose, cuisine: 'Cambodian', tags: ['Authentic', 'Casual'], reviewExcerpt: 'Food is incredible! Had the Beef Lok Lak', mapPosition: { x: 12, y: 15 } },
  { id: 'preview-lowell', name: 'Lowell Restaurant', dishId: 'lort-cha', distance: 17, rating: 4.4, reviewCount: 125, priceLevel: 2, address: 'Lowell, MA', isOpen: true, image: lowell, cuisine: 'Cambodian', tags: ['Authentic', 'Lowell'], reviewExcerpt: 'Food portion great! Food there is good', mapPosition: { x: 24, y: 10 } },
]
