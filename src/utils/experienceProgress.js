import { BOX_TARGET, collectibleDefinitions, collectibleKey } from '../data/collectionDefinitions'
import dotReached from '../assets/icons/progress-dot-reached.svg'
import dotNext from '../assets/icons/progress-dot-next.svg'
import boxReady from '../assets/collectibles/mystery-box-ready.webp'
import boxLocked from '../assets/collectibles/mystery-box-locked.webp'

export const unlockedCount = (state, countryId) => collectibleDefinitions.filter(item => state.unlocks[collectibleKey(countryId, item.id)]).length
export const pendingBox = (state, countryId) => Object.values(state.boxes).find(box => box.countryId === countryId && box.status !== 'opened')

/** Project session values into the existing Home progress-card geometry. */
export function countryProgressPresentation(state, country) {
  const { meals, count } = state.progress[country.id]
  const box = pendingBox(state, country.id), displayCount = box ? BOX_TARGET : count
  const next = meals < 11 ? 11 : meals < 25 ? 25 : meals < 50 ? 50 : Math.ceil((meals + 1) / 25) * 25
  const rank = meals < 11 ? 'Explorer I' : meals < 25 ? 'Explorer II' : 'Explorer III'
  return { name: `${country.flag} ${country.name}`,
    note: box ? 'Your Mystery Box is ready!' : `${BOX_TARGET - count} more ${BOX_TARGET - count === 1 ? 'experience' : 'experiences'} until your Mystery Box`,
    rank, lifetimeTotal: `Lifetime total: ${meals} meals`, nextRank: `Next rank in ${next - meals} meals`,
    bar: { height: 24,
      segments: [{ left: 9.76, top: 12, width: 341.62, tone: 'track' }, { left: 9.76, top: 12, width: 341.62 * displayCount / BOX_TARGET, tone: 'fill' }],
      markers: [0, 1, 2].map(index => ({ src: index < displayCount ? dotReached : dotNext, left: index * 119.79, top: 6.66, width: 13.31, height: 13.31 })),
      box: { src: box ? boxReady : boxLocked, left: 338.96, width: 26.62, height: 23.07, crop: !box, glow: Boolean(box) },
    },
    lifetime: { track: { left: 0, top: 2.66, width: 305.24 }, fill: { left: 0, top: 2.66, width: 305.24 * Math.min(meals / next, 1) } },
  }
}
