import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { recommendationReturnTo } from '../utils/navigation'
import { useExperience } from '../context/Experience'
import { collectionCountries, collectibleDefinitions, collectibleKey } from '../data/collectionDefinitions'
import { pendingBox, unlockedCount, countryProgressPresentation } from '../utils/experienceProgress'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import { FlowHeader, FlowState } from '../components/experience/FlowLayout'
import { countrySceneProps } from '../utils/countryScene'

export default function CountryCollection() {
  const { countryId } = useParams(), navigate = useNavigate(), { state } = useExperience()
  const location = useLocation(), returnTo = recommendationReturnTo(location.state?.returnTo, '/collections')
  const [modal, setModal] = useState(null)
  const country = collectionCountries.find(item => item.id === countryId)
  if (!country) return <FlowState title="Collection not found" backLabel="Back to Collections" onBack={() => navigate('/collections')}>Choose a country from your collections.</FlowState>
  const count = unlockedCount(state, country.id), box = pendingBox(state, country.id)
  const scene = countrySceneProps(country)
  const upcoming = country.id !== 'cambodia'
  return <div {...scene} data-upcoming={upcoming} className={`flow-page country-collection-page ${scene.className}`} style={scene.style}>
    <FlowHeader onBack={() => navigate(returnTo)} onInfo={() => setModal('progress')} />
    <div className="country-title"><h1>{country.flag} {country.name.toUpperCase()}</h1><p>{count} OF 6 COLLECTIBLES COLLECTED</p></div>
    {upcoming && <p className="country-pack-notice">Character pack coming soon. Your progress is saved; character art below is a placeholder.</p>}
    <div className={`collectibles-grid ${upcoming ? 'collectibles-upcoming' : ''}`}>{collectibleDefinitions.map(collectible => {
      const unlocked = Boolean(state.unlocks[collectibleKey(country.id, collectible.id)])
      return <button type="button" key={collectible.id} aria-label={upcoming ? `${collectible.name} placeholder, ${unlocked ? 'collected' : 'locked'}` : unlocked ? `View ${collectible.name}` : 'Locked collectible'} className="collectible-tile" onClick={() => unlocked ? navigate(`/collections/${country.id}/${collectible.id}`, { state: { countryReturnTo: returnTo } }) : setModal('progress')}>
        <CollectibleArtwork collectible={collectible} country={country} isUnlocked={unlocked} /><h2 style={{ color: upcoming ? 'var(--color-text-primary)' : unlocked ? collectible.color : '#ffffff' }}>{upcoming ? 'COMING SOON' : unlocked ? collectible.name.toUpperCase() : '???'}</h2><RarityBadge rarity={collectible.rarity} locked={!unlocked} />
      </button>
    })}</div>
    <section className="country-progress-section" aria-label={`${country.name} progress`}><CountryProgressCard {...countryProgressPresentation(state, country)} />
      {box && <button type="button" className="collection-pill" onClick={() => navigate(`/boxes/${box.id}`, { state: { returnTo: `/collections/${country.id}`, countryReturnTo: returnTo } })}>{box.status === 'opening' ? 'Continue opening your box' : 'Open your Mystery Box'}</button>}
    </section>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
