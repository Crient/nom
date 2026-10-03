import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const { region, setRegion } = useDiscoverySession()

  /* Optional single-select: tapping a chosen region clears it so Continue
     can still mean "skip". */
  const selectRegion = (id) => {
    setRegion(region === id ? null : id)
  }

  return (
    <div className="relative h-[1150px] w-full bg-surface">
      <StatusBar />

      <DiscoveryHeader
        step="4 of 4"
        markers={progressMarkers}
        markersAlt="Step 4 of 4"
        onBack={() => navigate('/discover/adventure')}
      />

      <h1 className="absolute top-[169px] left-[28px] w-[min(308px,calc(100%-56px))] text-display text-strong-neutral">
        Pick a{' '}
        <span className="text-accessible-teal underline decoration-solid decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]">
          cuisine
        </span>
        <br />
        region
      </h1>

      <p className="absolute top-[248px] left-[29px] w-[calc(100%-58px)] text-body-tight text-text-primary">
        <span className="font-bold text-error">optional</span>
        {' - '}
        choose one region to narrow down the recommendation
      </p>

      {regionRows.map((row) => (
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
      />

      <Button
        variant="soft"
        size="none"
        onClick={() => navigate('/recommendations')}
        className="absolute top-[1063px] left-[27px] h-[63px] w-[calc(100%-54px)] rounded-lg text-button tracking-meta"
      >
        Continue
      </Button>
    </div>
  )
}
