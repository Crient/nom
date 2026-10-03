import { useNavigate } from 'react-router-dom'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import OptionRow from '../components/discovery/OptionRow'
import OptionCard from '../components/discovery/OptionCard'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { foodTypeRows } from '../data/foodTypes'

import progressMarkers from '../assets/icons/discovery-progress-1.svg'

export default function FoodType() {
  const navigate = useNavigate()
  const { foodType, setFoodType } = useDiscoverySession()

  return (
    <div className="relative h-frame w-full bg-surface">
      <StatusBar />

      <DiscoveryHeader
        step="1 of 4"
        markers={progressMarkers}
        markersAlt="Step 1 of 4"
        onBack={() => navigate('/home')}
      />

      <h1 className="absolute top-[169px] left-[28px] w-[min(308px,calc(100%-56px))] text-display text-strong-neutral">
        What{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          sounds
        </span>{' '}
        good for you right now?
      </h1>

      <p className="absolute top-[248px] left-[29px] w-[calc(100%-58px)] text-body-tight text-text-primary">
        Choose one kind you’d like to eat.
      </p>

      {foodTypeRows.map((row) => (
        <OptionRow key={row.top} top={row.top} left={row.left}>
          {row.options.map((option) => (
            <OptionCard
              key={option.id}
              {...option}
              selected={foodType === option.id}
              onSelect={() => setFoodType(option.id)}
            />
          ))}
        </OptionRow>
      ))}

      <Button
        variant="soft"
        size="discovery"
        disabled={!foodType}
        onClick={() => navigate('/discover/flavor')}
        className="absolute top-[859px] left-[26px]"
      >
        Continue
      </Button>
    </div>
  )
}
