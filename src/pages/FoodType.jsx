import { useDiscoveryNavigation } from '../hooks/useDiscoveryNavigation'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import OptionRow from '../components/discovery/OptionRow'
import OptionCard from '../components/discovery/OptionCard'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { foodTypeRows } from '../data/foodTypes'

import progressMarkers from '../assets/icons/discovery-progress-1.svg'

export default function FoodType() {
  const { go: navigate } = useDiscoveryNavigation()
  const { foodType, setFoodType } = useDiscoverySession()

  return (
    <div className="discovery-page discovery-foodtype">
      <StatusBar />

      <DiscoveryHeader
        step="1 of 4"
        markers={progressMarkers}
        markersAlt="Step 1 of 4"
        onBack={() => navigate('/home')}
      />

      <h1 className="discovery-question text-display text-strong-neutral">
        What{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          sounds
        </span>{' '}
        good for you right now?
      </h1>

      <p className="discovery-support text-body-tight text-text-primary">
        Choose one kind you’d like to eat.
      </p>

      <div className="discovery-options">{foodTypeRows.map((row) => (
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
      ))}</div>

      <Button
        variant="soft"
        size="discovery"
        disabled={!foodType}
        onClick={() => navigate('/discover/flavor')}
        className="discovery-cta"
      >
        Continue
      </Button>
    </div>
  )
}
