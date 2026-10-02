import { describe, expect, it } from 'vitest'

import { dishes } from '../data/dishes'
import { projectDishTags } from './dishTags'

const lortCha = dishes.find((dish) => dish.id === 'lort-cha')
const pancitBihon = dishes.find((dish) => dish.id === 'pancit-bihon')
const numBanhChok = dishes.find((dish) => dish.id === 'num-banh-chok')

describe('projectDishTags', () => {
  it('projects Lort Cha with matched comforting first and reserved Adventure', () => {
    expect(
      projectDishTags(lortCha, {
        matchedPreferenceFlavors: ['comforting'],
        limit: 4,
      }),
    ).toEqual(['Noodles', 'Comforting', 'Savory', 'Adventure'])
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
})
