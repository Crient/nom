import cambodia from '../assets/experience/country-cambodia.webp'
import colombia from '../assets/experience/country-backgrounds/colombia.png'
import unitedStates from '../assets/experience/country-backgrounds/united-states.png'
import japan from '../assets/experience/country-backgrounds/japan.png'
import italy from '../assets/experience/country-backgrounds/italy.png'
import india from '../assets/experience/country-backgrounds/india.png'
import china from '../assets/experience/country-backgrounds/china.png'
import france from '../assets/experience/country-backgrounds/france.png'
import background from '../assets/experience/cambodia-background.webp'
import ziggy from '../assets/experience/ziggy.webp'
import kiko from '../assets/experience/kiko.webp'
import fenn from '../assets/experience/fenn.webp'
import milo from '../assets/experience/milo.webp'
import nox from '../assets/experience/nox.webp'
import lumi from '../assets/experience/lumi.webp'
import commonGlow from '../assets/experience/common-glow.webp'
import rareGlow from '../assets/experience/rare-glow.webp'
import epicGlow from '../assets/experience/epic-glow.webp'
import legendaryGlow from '../assets/experience/legendary-glow.webp'
import sampot from '../assets/experience/sampot.webp'
import belt from '../assets/experience/belt.webp'
import crown from '../assets/experience/crown.webp'
import lotus from '../assets/experience/lotus.webp'

/** Figma demonstration collections; these are reward metadata, not dish taxonomy. */
export const collectionCountries = [
  { id: 'cambodia', code: 'KH', name: 'Cambodia', flag: '🇰🇭', image: cambodia, background, seedUnlocked: 5, seedMeals: 17, seedProgress: 2 },
  { id: 'colombia', code: 'CO', name: 'Colombia', flag: '🇨🇴', image: colombia, background: colombia, cardPosition: 'center 22%', seedUnlocked: 3, seedMeals: 9, seedProgress: 1 },
  { id: 'united-states', code: 'US', name: 'United States', flag: '🇺🇸', image: unitedStates, background: unitedStates, cardPosition: 'center 22%', seedUnlocked: 2, seedMeals: 26, seedProgress: 2 },
  { id: 'japan', code: 'JP', name: 'Japan', flag: '🇯🇵', image: japan, background: japan, cardPosition: 'center 22%', seedUnlocked: 4, seedMeals: 0, seedProgress: 0 },
  { id: 'italy', code: 'IT', name: 'Italy', flag: '🇮🇹', image: italy, background: italy, cardPosition: 'center 22%', seedUnlocked: 5, seedMeals: 0, seedProgress: 0 },
  { id: 'india', code: 'IN', name: 'India', flag: '🇮🇳', image: india, background: india, cardPosition: 'center 22%', seedUnlocked: 1, seedMeals: 0, seedProgress: 0 },
  { id: 'china', code: 'CN', name: 'China', flag: '🇨🇳', image: china, background: china, cardPosition: 'center 22%', seedUnlocked: 5, seedMeals: 0, seedProgress: 0 },
  { id: 'france', code: 'FR', name: 'France', flag: '🇫🇷', image: france, background: france, cardPosition: 'center 22%', seedUnlocked: 2, seedMeals: 0, seedProgress: 0 },
]

export const collectibleDefinitions = [
  { id: 'ziggy', name: 'Ziggy', rarity: 'common', image: ziggy, glow: commonGlow, color: '#fcdc7f' },
  { id: 'kiko', name: 'Kiko', rarity: 'common', image: kiko, glow: commonGlow, color: '#0e65e5' },
  { id: 'fenn', name: 'Fenn', rarity: 'rare', image: fenn, glow: rareGlow, color: '#c83331' },
  { id: 'milo', name: 'Milo', rarity: 'rare', image: milo, glow: rareGlow, color: '#337630' },
  { id: 'nox', name: 'Nox', rarity: 'epic', image: nox, glow: epicGlow, color: '#42356d' },
  { id: 'lumi', name: 'Lumi', rarity: 'legendary', image: lumi, glow: legendaryGlow, color: '#cd7314', detailColor: '#9f5200',
    description: 'Lumi carries a little light wherever she goes. Her Cambodia look draws from elegant Khmer dress, golden ornamentation, and the lotus, reflecting her warm and graceful personality.',
    inspiration: [{ name: 'Sampot Sbai', image: sampot }, { name: 'Khsae Krovat', image: belt }, { name: 'Apsara Crown', image: crown }, { name: 'Lotus (Pka Chuk)', image: lotus }],
  },
]

export const collectibleKey = (countryId, collectibleId) => `${countryId}:${collectibleId}`
export const BOX_TARGET = 3
