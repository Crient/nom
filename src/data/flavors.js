import { buildOptionRows } from './discoverySlots'

import flavorSpicy from '../assets/food/flavor-spicy.png'
import flavorComforting from '../assets/food/flavor-comforting.png'
import flavorFresh from '../assets/food/flavor-fresh.png'
import flavorRich from '../assets/food/flavor-rich.png'
import flavorCrispy from '../assets/food/flavor-crispy.png'
import flavorTangy from '../assets/food/flavor-tangy.png'

export const MAX_FLAVORS = 2

export const flavorRows = buildOptionRows([
  { id: 'spicy', label: 'Spicy', image: flavorSpicy },
  // Same stray shadow as Food Type's Rice card on this slot.
  { id: 'comforting', label: 'Comforting', image: flavorComforting, raised: true },
  { id: 'fresh', label: 'Fresh', image: flavorFresh },
  { id: 'rich', label: 'Rich', image: flavorRich },
  { id: 'crispy', label: 'Crispy', image: flavorCrispy },
  { id: 'tangy', label: 'Tangy', image: flavorTangy },
])
