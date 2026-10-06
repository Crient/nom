import { useDiscoveryNavigation } from '../hooks/useDiscoveryNavigation'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import ListOption from '../components/discovery/ListOption'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { adventureOptions } from '../data/adventureOptions'

import progressMarkers from '../assets/icons/discovery-progress-3.svg'

export default function Adventure() {
  const { go: navigate } = useDiscoveryNavigation()
  const { adventurousness, setAdventurousness } = useDiscoverySession()

  return (
    <div className="discovery-page discovery-adventure">
      <StatusBar />

      <DiscoveryHeader
        step="3 of 4"
        markers={progressMarkers}
        markersAlt="Step 3 of 4"
        onBack={() => navigate('/discover/flavor')}
      />

      <h1 className="discovery-question text-display text-strong-neutral">
        How{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          adventurous
        </span>{' '}
        are you feeling?
      </h1>

      <p className="discovery-support text-body-tight text-text-primary">
        Choose your comfort level.
      </p>

      <div className="discovery-options">{adventureOptions.map((option) => (
        <ListOption
          key={option.id}
          {...option}
          selected={adventurousness === option.id}
          onSelect={() => setAdventurousness(option.id)}
        />
      ))}</div>

      <Button
        variant="soft"
        size="discovery"
        disabled={!adventurousness}
        onClick={() => navigate('/discover/region')}
        className="discovery-cta"
      >
        Continue
      </Button>
    </div>
  )
}
