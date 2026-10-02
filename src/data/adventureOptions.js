import adventureFamiliar from '../assets/food/adventure-familiar.png'
import adventureDifferent from '../assets/food/adventure-different.png'
import adventureAdventurous from '../assets/food/adventure-adventurous.png'
import adventureSurprise from '../assets/food/adventure-surprise.png'

/**
 * Adventurousness choices from 0.1.04 Adventure Scale.
 *
 * Wording follows the final frame, not the shorter Familiar / New / Surprise Me
 * labels used in earlier product notes.
 */
export const adventureOptions = [
  {
    id: 'familiar',
    top: 304,
    title: 'Keep It Familiar',
    subtitle: 'Stick with something easy and familiar',
    icon: adventureFamiliar,
  },
  {
    id: 'different',
    top: 420,
    title: 'Try Something Different',
    subtitle: 'A little outside my usual picks',
    icon: adventureDifferent,
  },
  {
    id: 'adventurous',
    top: 536,
    title: 'Feeling Adventurous',
    subtitle: 'Take me further outside my comfort zone',
    subtitleWidth: 185,
    icon: adventureAdventurous,
  },
  {
    id: 'surprise-me',
    top: 651,
    title: 'Surprise Me',
    subtitle: 'Pick for me',
    icon: adventureSurprise,
  },
]
