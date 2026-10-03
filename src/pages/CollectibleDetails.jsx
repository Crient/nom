import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useExperience } from '../context/Experience'
import { collectionCountries, collectibleDefinitions, collectibleKey } from '../data/collectionDefinitions'
import { FlowHeader, FlowState } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import detailBackground from '../assets/experience/detail-background.webp'
import detailOverlay from '../assets/experience/detail-overlay.webp'
import calendar from '../assets/experience/calendar.svg'
import pin from '../assets/experience/pin.svg'
import star from '../assets/experience/star.svg'

export default function CollectibleDetails() {
  const { countryId, collectibleId } = useParams(), navigate = useNavigate()
  const { state, toggleCollectibleFavorite } = useExperience(), [modal, setModal] = useState(null)
  const country = collectionCountries.find(item => item.id === countryId), collectible = collectibleDefinitions.find(item => item.id === collectibleId)
  const key = collectibleKey(countryId, collectibleId), unlock = state.unlocks[key]
  if (!country || !collectible || !unlock) return <FlowState title={country && collectible ? 'Collectible locked' : 'Collectible not found'} backLabel={country ? 'Back to collection' : 'Back to Collections'} onBack={() => navigate(country ? `/collections/${country.id}` : '/collections')}>Earn and open a Mystery Box to discover collectibles.</FlowState>
  const favorite = state.favorites.includes(key), hasArtwork = country.id === 'cambodia'
  const discovered = new Date(unlock.discoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const inspiration = hasArtwork ? collectible.inspiration : null
  return <div className="flow-page collectible-details-page collection-background" style={{ '--collection-background': `url("${hasArtwork ? detailBackground : country.image}")` }}>
    {hasArtwork && <img className="collectible-detail-overlay" src={detailOverlay} alt="" />}
    <FlowHeader onBack={() => navigate(`/collections/${country.id}`)} onInfo={() => setModal('progress')} />
    <div className="collectible-detail-hero"><CollectibleArtwork collectible={collectible} country={country} isUnlocked /><h1 style={{ color: collectible.detailColor ?? collectible.color }}>{collectible.name.toUpperCase()}</h1><RarityBadge rarity={collectible.rarity} /></div>
    <p className="collectible-description">{hasArtwork && collectible.description ? collectible.description : `${collectible.name} is part of your ${country.name} collection. Discover country collectibles by exploring dishes and opening your earned Mystery Boxes.`}</p>
    <dl className="collectible-discovery"><div><dt><img src={calendar} alt="" />Discovered On</dt><dd>{discovered}</dd></div><div><dt><img src={pin} alt="" />Location</dt><dd>{country.name}</dd></div></dl>
    {inspiration && <section className="collectible-inspiration"><h2>Inspired by</h2><div>{inspiration.map(item => <article key={item.name}><img src={item.image} alt="" /><p>{item.name}</p></article>)}</div></section>}
    {!hasArtwork && <p className="flow-demo">This country’s character artwork uses a development placeholder.</p>}
    <button type="button" className="collection-pill collectible-favorite" aria-pressed={favorite} onClick={() => toggleCollectibleFavorite(key)}><img src={star} alt="" />{favorite ? 'Remove from favorites' : 'Add to favorites'}</button>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
