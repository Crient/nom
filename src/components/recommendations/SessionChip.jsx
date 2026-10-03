import { cn } from '../../utils/cn'
import Image from '../ui/Image'

import typeNoodle from '../../assets/food/type-noodle.webp'
import typeRice from '../../assets/food/type-rice.webp'
import typeSoupBroth from '../../assets/food/type-soup-broth.webp'
import typeGrilledProtein from '../../assets/food/type-grilled-protein.webp'
import typeHandheld from '../../assets/food/type-handheld.webp'
import typeAnything from '../../assets/food/type-anything.webp'

import flavorSpicy from '../../assets/food/flavor-spicy.webp'
import flavorComforting from '../../assets/food/flavor-comforting.webp'
import flavorFresh from '../../assets/food/flavor-fresh.webp'
import flavorRich from '../../assets/food/flavor-rich.webp'
import flavorCrispy from '../../assets/food/flavor-crispy.webp'
import flavorTangy from '../../assets/food/flavor-tangy.webp'

import adventureFamiliar from '../../assets/food/adventure-familiar.webp'
import adventureDifferent from '../../assets/food/adventure-different.webp'
import adventureAdventurous from '../../assets/food/adventure-adventurous.webp'
import adventureSurprise from '../../assets/food/adventure-surprise.webp'

import regionEastAsia from '../../assets/food/region-east-asia.webp'
import regionSoutheastAsia from '../../assets/food/region-southeast-asia.webp'
import regionSouthAsia from '../../assets/food/region-south-asia.webp'
import regionMiddleEast from '../../assets/food/region-middle-east.webp'
import regionAfrica from '../../assets/food/region-africa.webp'
import regionEurope from '../../assets/food/region-europe.webp'
import regionLatinAmerica from '../../assets/food/region-latin-america.webp'
import regionNorthAmerica from '../../assets/food/region-north-america.webp'
import regionSurprise from '../../assets/food/region-surprise.webp'

const CHIP_ICONS = {
  foodType: {
    noodle: typeNoodle,
    rice: typeRice,
    'soup-broth': typeSoupBroth,
    'grilled-protein': typeGrilledProtein,
    handheld: typeHandheld,
    anything: typeAnything,
  },
  flavor: {
    spicy: flavorSpicy,
    comforting: flavorComforting,
    fresh: flavorFresh,
    rich: flavorRich,
    crispy: flavorCrispy,
    tangy: flavorTangy,
  },
  adventure: {
    familiar: adventureFamiliar,
    different: adventureDifferent,
    adventurous: adventureAdventurous,
    'surprise-me': adventureSurprise,
  },
  region: {
    'east-asia': regionEastAsia,
    'southeast-asia': regionSoutheastAsia,
    'south-asia': regionSouthAsia,
    'middle-east': regionMiddleEast,
    africa: regionAfrica,
    europe: regionEurope,
    'latin-america': regionLatinAmerica,
    'north-america': regionNorthAmerica,
    'surprise-me': regionSurprise,
  },
}

export default function SessionChip({ chip, className, variant = 'default' }) {
  const icon = CHIP_ICONS[chip.kind]?.[chip.value]
  const detail = variant === 'detail'
  const nearby = variant === 'nearby'

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-[4px] rounded-full bg-teal-tint shadow-card',
        nearby ? 'h-[20px] px-[8px]' : detail ? 'h-[28px] px-[10px]' : 'h-[26.469px] px-[10px]',
        className,
      )}
    >
      {icon && <Image src={icon} alt="" className={cn('max-w-none object-contain', nearby ? 'size-[12px]' : detail ? 'size-[18px]' : 'size-[16px]')} />}
      <span className={cn(
        'font-bold whitespace-nowrap text-accessible-teal',
        nearby ? 'text-[8px] leading-[10px]' : detail ? 'text-[11px] leading-[10px]' : 'text-[10.329px] leading-[9.762px]',
      )}>
        {chip.label}
      </span>
    </span>
  )
}
