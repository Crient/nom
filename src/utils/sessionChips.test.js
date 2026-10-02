import { describe, expect, it } from 'vitest'

import { formatSessionChips } from './sessionChips'
import { SURPRISE_ME } from './recommendationEngine'

const PAINTED_SESSION = {
  foodType: 'noodle',
  flavors: ['spicy', 'comforting'],
  adventurousness: 'adventurous',
  region: 'southeast-asia',
}

describe('formatSessionChips', () => {
  it('formats the painted discovery session', () => {
    expect(formatSessionChips(PAINTED_SESSION).map((chip) => chip.label)).toEqual([
      'Noodles',
      'Spicy',
      'Comforting',
      'Adventurous',
      'Southeast Asian',
    ])
  })

  it('omits region when the user skipped it', () => {
    const chips = formatSessionChips({ ...PAINTED_SESSION, region: null })
    expect(chips.map((chip) => chip.kind)).toEqual(['foodType', 'flavor', 'flavor', 'adventure'])
  })

  it('labels region Surprise Me instead of a cuisine region', () => {
    const chips = formatSessionChips({ ...PAINTED_SESSION, region: SURPRISE_ME })
    expect(chips.at(-1)).toMatchObject({ kind: 'region', label: 'Surprise Me' })
  })

  it('labels adventure Surprise Me instead of a familiarity level', () => {
    const chips = formatSessionChips({ ...PAINTED_SESSION, adventurousness: SURPRISE_ME })
    expect(chips.find((chip) => chip.kind === 'adventure')).toMatchObject({ label: 'Surprise Me' })
  })
})
