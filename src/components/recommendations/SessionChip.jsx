import { cn } from '../../utils/cn'

import typeNoodle from '../../assets/food/type-noodle.png'
import typeRice from '../../assets/food/type-rice.png'
import typeSoupBroth from '../../assets/food/type-soup-broth.png'
import typeGrilledProtein from '../../assets/food/type-grilled-protein.png'
import typeHandheld from '../../assets/food/type-handheld.png'
import typeAnything from '../../assets/food/type-anything.png'

import flavorSpicy from '../../assets/food/flavor-spicy.png'
import flavorComforting from '../../assets/food/flavor-comforting.png'
import flavorFresh from '../../assets/food/flavor-fresh.png'
import flavorRich from '../../assets/food/flavor-rich.png'
import flavorCrispy from '../../assets/food/flavor-crispy.png'
import flavorTangy from '../../assets/food/flavor-tangy.png'

import adventureFamiliar from '../../assets/food/adventure-familiar.png'
import adventureDifferent from '../../assets/food/adventure-different.png'
import adventureAdventurous from '../../assets/food/adventure-adventurous.png'
import adventureSurprise from '../../assets/food/adventure-surprise.png'

import regionEastAsia from '../../assets/food/region-east-asia.png'
import regionSoutheastAsia from '../../assets/food/region-southeast-asia.png'
import regionSouthAsia from '../../assets/food/region-south-asia.png'
import regionMiddleEast from '../../assets/food/region-middle-east.png'
import regionAfrica from '../../assets/food/region-africa.png'
import regionEurope from '../../assets/food/region-europe.png'
import regionLatinAmerica from '../../assets/food/region-latin-america.png'
import regionNorthAmerica from '../../assets/food/region-north-america.png'
import regionSurprise from '../../assets/food/region-surprise.png'

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

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-[4px] rounded-full bg-teal-tint px-[10px] shadow-card',
        detail ? 'h-[28px]' : 'h-[26.469px]',
        className,
      )}
    >
      {icon && <img src={icon} alt="" className={cn('max-w-none object-contain', detail ? 'size-[18px]' : 'size-[16px]')} />}
      <span className={cn(
        'font-bold whitespace-nowrap text-primary-teal',
        detail ? 'text-[11px] leading-[10px]' : 'text-[10.329px] leading-[9.762px]',
      )}>
        {chip.label}
      </span>
    </span>
  )
}
