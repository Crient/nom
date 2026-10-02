import { buildOptionRows } from './discoverySlots'

import typeNoodle from '../assets/food/type-noodle.png'
import typeRice from '../assets/food/type-rice.png'
import typeSoupBroth from '../assets/food/type-soup-broth.png'
import typeGrilledProtein from '../assets/food/type-grilled-protein.png'
import typeHandheld from '../assets/food/type-handheld.png'
import typeAnything from '../assets/food/type-anything.png'

export const foodTypeRows = buildOptionRows([
  { id: 'noodle', label: 'Noodle', image: typeNoodle },
  // The Rice card alone carries a box shadow in the frame.
  { id: 'rice', label: 'Rice', image: typeRice, raised: true },
  { id: 'soup-broth', label: 'Soup/Broth', image: typeSoupBroth },
  { id: 'grilled-protein', label: 'Grilled/Protein', image: typeGrilledProtein },
  { id: 'handheld', label: 'Handheld', image: typeHandheld },
  { id: 'anything', label: 'Anything', image: typeAnything },
])
