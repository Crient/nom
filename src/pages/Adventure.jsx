import { useNavigate } from 'react-router-dom'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import ListOption from '../components/discovery/ListOption'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { adventureOptions } from '../data/adventureOptions'

import progressMarkers from '../assets/icons/discovery-progress-3.svg'

export default function Adventure() {
  const navigate = useNavigate()
  const { adventurousness, setAdventurousness } = useDiscoverySession()

  return (
    <div className="relative h-frame w-full overflow-hidden bg-surface">
      <StatusBar />

      <DiscoveryHeader
        step="3 of 4"
        markers={progressMarkers}
        markersAlt="Step 3 of 4"
        onBack={() => navigate('/discover/flavor')}
      />

      <h1 className="absolute top-[169px] left-[28px] w-[308px] text-display text-strong-neutral">
        How{' '}
        <span className="text-alt-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          adventurous
        </span>{' '}
        are you feeling?
      </h1>

      <p className="absolute top-[248px] left-[29px] w-[402.557px] text-body-tight text-text-primary">
        Choose your comfort level.
      </p>

      {adventureOptions.map((option) => (
        <ListOption
          key={option.id}
          {...option}
          selected={adventurousness === option.id}
          onSelect={() => setAdventurousness(option.id)}
        />
      ))}

      <Button
        variant="soft"
        size="discovery"
        disabled={!adventurousness}
        className="absolute top-[859px] left-[26px]"
      >
        Continue
      </Button>
    </div>
  )
}
