import boxLocked from '../assets/collectibles/mystery-box-locked.png'
import boxReady from '../assets/collectibles/mystery-box-ready.png'
import dotReached from '../assets/icons/progress-dot-reached.svg'
import dotNext from '../assets/icons/progress-dot-next.svg'
import track96 from '../assets/icons/progress-track-96.svg'
import track100 from '../assets/icons/progress-track-100.svg'
import track101 from '../assets/icons/progress-track-101.svg'

/**
 * Temporary local data for the Home progress cards.
 *
 * The bar geometry is carried per country because the Figma cards are drawn
 * layer by layer rather than from a single progress value — inferring one
 * would mean inventing a model the design does not define.
 */
export const countryProgress = [
  {
    id: 'cambodia',
    name: '🇰🇭 Cambodia',
    note: '1 more experience until your Mystery Box',
    rank: 'Explorer II',
    lifetimeTotal: 'Lifetime total: 17 meals',
    nextRank: 'Next rank in 8 meals',
    top: 582.08,
    left: 23.96,
    bar: {
      height: 23.07,
      segments: [
        { left: 9.76, top: 11.98, width: 245.789, tone: 'base' },
        { left: 9.76, top: 11.98, width: 245.789, tone: 'fill' },
        { left: 247.56, top: 11.98, width: 103.817, tone: 'track' },
      ],
      markers: [
        { src: dotReached, left: 0, top: 6.66, width: 13.31, height: 13.31 },
        { src: dotReached, left: 119.79, top: 6.66, width: 13.31, height: 13.31 },
        { src: dotNext, left: 238.69, top: 6.66, width: 13.31, height: 13.31 },
      ],
      box: { src: boxLocked, left: 338.96, width: 26.62, height: 23.07, crop: true },
    },
    lifetime: {
      track: { left: 79.86, top: 2.66, width: 225.38 },
      fill: { left: 0, top: 2.66, width: 92.282 },
      rankLeft: 309.68,
    },
  },
  {
    id: 'colombia',
    name: '🇨🇴 Colombia',
    note: '2 more experience until your Mystery Box',
    rank: 'Explorer I',
    lifetimeTotal: 'Lifetime total: 9 meals',
    nextRank: 'Next rank in 2 meals',
    top: 719.62,
    left: 23.07,
    bar: {
      height: 24.845,
      segments: [
        { left: 9.76, top: 14.14, width: 245.789, tone: 'base' },
        { left: 9.76, top: 14.14, width: 122.451, tone: 'fill' },
        { left: 131.32, top: 14.14, width: 220.056, tone: 'fill' },
      ],
      markers: [
        { src: track96, left: 0, top: 8.82, width: 13.31, height: 13.31 },
        { src: track100, left: 119.79, top: 8.82, width: 133.1, height: 13.31 },
      ],
      box: { src: boxReady, left: 343.39, width: 26.503, height: 24.845, glow: true },
    },
    lifetime: {
      track: { left: 44.37, top: 3.11, width: 260.873 },
      fill: { left: 0, top: 3.11, width: 53.239 },
      rankLeft: 313.23,
    },
  },
  {
    id: 'united-states',
    name: '🇺🇸 United States',
    note: '1 more experience until your Mystery Box',
    rank: 'Explorer III',
    lifetimeTotal: 'Lifetime total: 26 meals',
    nextRank: 'Next rank in 24 meals',
    top: 857.15,
    left: 23.07,
    bar: {
      height: 23.07,
      segments: [
        { left: 9.76, top: 11.98, width: 245.789, tone: 'base' },
        { left: 9.76, top: 11.98, width: 122.451, tone: 'fill' },
        { left: 131.32, top: 11.98, width: 220.056, tone: 'track' },
      ],
      markers: [
        { src: dotReached, left: 0, top: 6.65, width: 13.31, height: 13.31 },
        { src: track101, left: 119.79, top: 6.65, width: 132.211, height: 13.31 },
      ],
      box: { src: boxLocked, left: 338.96, width: 26.62, height: 23.07, crop: true },
    },
    lifetime: {
      track: { left: 44.37, top: 3.11, width: 260.873 },
      fill: { left: 0, top: 3.11, width: 119.789 },
      rankLeft: 307.01,
    },
  },
]
