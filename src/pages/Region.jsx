import { useDiscoveryNavigation } from '../hooks/useDiscoveryNavigation'

import StatusBar from '../components/layout/StatusBar'
import DiscoveryHeader from '../components/discovery/DiscoveryHeader'
import OptionRow from '../components/discovery/OptionRow'
import RegionCard from '../components/discovery/RegionCard'
import SurpriseRegionCard from '../components/discovery/SurpriseRegionCard'
import Button from '../components/ui/Button'
import { useDiscoverySession } from '../context/DiscoverySession'
import { regionRows, SURPRISE_REGION_ID } from '../data/regions'

import progressMarkers from '../assets/icons/discovery-progress-4.svg'

export default function Region() {
  const { go: navigate, finish } = useDiscoveryNavigation()
  const { region, setRegion } = useDiscoverySession()

  /* Optional single-select: tapping a chosen region clears it so Continue
     can still mean "skip". */
  const selectRegion = (id) => {
    setRegion(region === id ? null : id)
  }

  return (
    <div className="discovery-page discovery-region">
      <StatusBar />

      <DiscoveryHeader
        step="4 of 4"
        markers={progressMarkers}
        markersAlt="Step 4 of 4"
        onBack={() => navigate('/discover/adventure')}
      />

      <h1 className="discovery-question text-display text-strong-neutral">
        Pick a{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          cuisine
        </span>
        <br />
        {' '}region
      </h1>

      <p className="discovery-support text-body-tight text-text-primary">
        <span className="font-bold text-error">optional</span>
        {' - '}
        choose one region to narrow down the recommendation
      </p>

      <div className="discovery-options">{regionRows.map((row) => (
        <OptionRow key={row.top} top={row.top} left={row.left} gap={10}>
          {row.options.map((option) => (
            <RegionCard
              key={option.id}
              {...option}
              selected={region === option.id}
              onSelect={() => selectRegion(option.id)}
            />
          ))}
        </OptionRow>
      ))}

      <SurpriseRegionCard
        selected={region === SURPRISE_REGION_ID}
        onSelect={() => selectRegion(SURPRISE_REGION_ID)}
      /></div>

      <Button
        variant="soft"
        size="none"
        onClick={finish}
        className="discovery-cta min-h-[63px] rounded-lg text-button tracking-meta"
      >
        Continue
      </Button>
    </div>
  )
}
