import { SURPRISE_ME } from './recommendationEngine'

export const FOOD_TYPE_LABELS = {
  noodle: 'Noodles',
  rice: 'Rice',
  'soup-broth': 'Soup/Broth',
  'grilled-protein': 'Grilled/Protein',
  handheld: 'Handheld',
  anything: 'Anything',
}

export const FLAVOR_LABELS = {
  spicy: 'Spicy',
  comforting: 'Comforting',
  fresh: 'Fresh',
  rich: 'Rich',
  crispy: 'Crispy',
  tangy: 'Tangy',
}

export const ADVENTURE_CHIP_LABELS = {
  familiar: 'Familiar',
  different: 'Different',
  adventurous: 'Adventurous',
  [SURPRISE_ME]: 'Surprise Me',
}

export const REGION_CHIP_LABELS = {
  'east-asia': 'East Asian',
  'southeast-asia': 'Southeast Asian',
  'south-asia': 'South Asian',
  'middle-east': 'Middle Eastern',
  africa: 'African',
  europe: 'European',
  'latin-america': 'Latin American',
  'north-america': 'North American',
  [SURPRISE_ME]: 'Surprise Me',
}

function titleCase(value) {
  return String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Header chips describe the current discovery session, not a dish.
 * region === null is omitted. Surprise Me keeps its product label.
 */
export function formatSessionChips(session) {
  const chips = []

  if (session.foodType) {
    chips.push({
      id: `foodType:${session.foodType}`,
      kind: 'foodType',
      value: session.foodType,
      label: FOOD_TYPE_LABELS[session.foodType] ?? titleCase(session.foodType),
    })
  }

  for (const flavor of session.flavors ?? []) {
    chips.push({
      id: `flavor:${flavor}`,
      kind: 'flavor',
      value: flavor,
      label: FLAVOR_LABELS[flavor] ?? titleCase(flavor),
    })
  }

  if (session.adventurousness) {
    chips.push({
      id: `adventure:${session.adventurousness}`,
      kind: 'adventure',
      value: session.adventurousness,
      label: ADVENTURE_CHIP_LABELS[session.adventurousness] ?? titleCase(session.adventurousness),
    })
  }

  if (session.region) {
    chips.push({
      id: `region:${session.region}`,
      kind: 'region',
      value: session.region,
      label: REGION_CHIP_LABELS[session.region] ?? titleCase(session.region),
    })
  }

  return chips
}
