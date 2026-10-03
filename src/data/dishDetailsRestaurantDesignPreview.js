import thmorDa from '../assets/restaurants/preview-thmor-da.png'
import goldenMonkey from '../assets/restaurants/preview-golden-monkey.png'
import peephuptmei from '../assets/restaurants/preview-peephuptmei.png'

/**
 * Temporary visual fixtures from Figma 263:4426, scoped to its Lort Cha example.
 * Ratings/distances are design-preview copy, not live location or availability data.
 * Never feed these into the dish catalog or recommendation engine.
 */
export const dishDetailsRestaurantDesignPreview = {
  dishId: 'lort-cha',
  restaurants: [
    { id: 'preview-thmor-da', name: 'THMOR DA Restaurant', rating: '4.6', reviews: 269, distance: '1.2 mi', image: thmorDa, imagePosition: 'center 33.3%' },
    { id: 'preview-golden-monkey', name: 'The Golden Monkey Cafe', rating: '4.7', reviews: 142, distance: '1.8 mi', image: goldenMonkey },
    // User-requested preview distance; the current Figma text says 16 mi.
    { id: 'preview-peephuptmei', name: 'Peephuptmei Restaurant', rating: '4.2', reviews: 271, distance: '18 mi', image: peephuptmei },
  ],
}
