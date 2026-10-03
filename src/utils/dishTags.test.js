import { describe, expect, it } from 'vitest'

import { dishes } from '../data/dishes'
import { projectDishTags, DESCRIPTOR_LABELS } from './dishTags'
import taxonomy from '../data/catalog/taxonomy.json'
import { FOOD_TYPE_LABELS, FLAVOR_LABELS, ADVENTURE_CHIP_LABELS } from './sessionChips'

const lortCha = dishes.find((dish) => dish.id === 'lort-cha')
const pancitBihon = dishes.find((dish) => dish.id === 'pancit-bihon')
const numBanhChok = dishes.find((dish) => dish.id === 'num-banh-chok')

describe('projectDishTags', () => {
  it('projects Lort Cha with matched comforting first and consistent Adventurous terminology', () => {
    expect(
      projectDishTags(lortCha, {
        matchedPreferenceFlavors: ['comforting'],
        limit: 4,
      }),
    ).toEqual(['Noodles', 'Comforting', 'Savory', 'Adventurous'])
  })

  it('caps compact cards at three tags and skips unused adventure', () => {
    expect(
      projectDishTags(pancitBihon, {
        matchedPreferenceFlavors: ['comforting'],
        limit: 3,
      }),
    ).toEqual(['Noodles', 'Comforting', 'Savory'])
  })

  it('keeps remaining preference flavors after matched ones', () => {
    expect(
      projectDishTags(numBanhChok, {
        matchedPreferenceFlavors: ['comforting'],
        limit: 3,
      }),
    ).toEqual(['Noodles', 'Comforting', 'Fresh'])
  })

  it('covers every catalog descriptor with proper labels without leaking unsupported IDs', () => {
    expect(Object.keys(DESCRIPTOR_LABELS)).toEqual(taxonomy.descriptors)
    const allowed = [...Object.values(FOOD_TYPE_LABELS), ...Object.values(FLAVOR_LABELS), ...Object.values(DESCRIPTOR_LABELS), ...Object.values(ADVENTURE_CHIP_LABELS)]
    for (const dish of dishes) expect(projectDishTags(dish).every(label => allowed.includes(label))).toBe(true)
    expect(projectDishTags({ foodType: 'internal-type', preferenceFlavors: ['internal-flavor'], descriptors: ['internal-descriptor'] })).toEqual([])
  })
})
