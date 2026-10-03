import { useDiscoveryNavigation } from '../hooks/useDiscoveryNavigation'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import OptionRow from '../components/discovery/OptionRow'
import OptionCard from '../components/discovery/OptionCard'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { flavorRows, MAX_FLAVORS } from '../data/flavors'

import progressMarkers from '../assets/icons/discovery-progress-2.svg'

export default function Flavor() {
  const { go: navigate } = useDiscoveryNavigation()
  const { flavors, setFlavors } = useDiscoverySession()

  /* Tapping a chosen flavour clears it; otherwise it is added until the cap
     is reached, after which further taps do nothing. */
  const toggleFlavor = (id) => {
    setFlavors((current) => {
      if (current.includes(id)) {
        return current.filter((flavor) => flavor !== id)
      }

      return current.length < MAX_FLAVORS ? [...current, id] : current
    })
  }

  return (
    <div className="relative h-frame w-full bg-surface">
      <StatusBar />

      <DiscoveryHeader
        step="2 of 4"
        markers={progressMarkers}
        markersAlt="Step 2 of 4"
        onBack={() => navigate('/discover/food-type')}
      />

      <h1 className="absolute top-[169px] left-[28px] w-[min(308px,calc(100%-56px))] text-display text-strong-neutral">
        What{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          flavors
        </span>{' '}
        are you looking for?
      </h1>

      <p className="absolute top-[248px] left-[29px] w-[calc(100%-58px)] text-body-tight text-text-primary">
        Choose up to two.
      </p>

      {flavorRows.map((row) => (
        <OptionRow key={row.top} top={row.top} left={row.left}>
          {row.options.map((option) => (
            <OptionCard
              key={option.id}
              {...option}
              selected={flavors.includes(option.id)}
              onSelect={() => toggleFlavor(option.id)}
            />
          ))}
        </OptionRow>
      ))}

      <Button
        variant="soft"
        size="discovery"
        disabled={flavors.length === 0}
        onClick={() => navigate('/discover/adventure')}
        className="absolute top-[859px] left-[26px]"
      >
        Continue
      </Button>
    </div>
  )
}
