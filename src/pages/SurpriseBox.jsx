import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useExperience } from '../context/Experience'
import { collectionCountries, collectibleDefinitions } from '../data/collectionDefinitions'
import { FlowHeader, FlowState } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import closed from '../assets/experience/box-closed.webp'
import opening from '../assets/experience/box-open.webp'
import revealGlow from '../assets/experience/reveal-glow.webp'

export default function SurpriseBox({ phase = 'closed' }) {
  const { boxId } = useParams(), navigate = useNavigate()
  const { state, beginBox, openBox } = useExperience()
  const [modal, setModal] = useState(null)
  const box = state.boxes[boxId], country = collectionCountries.find(item => item.id === box?.countryId)
  useEffect(() => {
    if (phase !== 'opening' || box?.status !== 'opening') return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => { openBox(boxId); navigate(`/boxes/${boxId}/reveal`, { replace: true }) }, reduceMotion ? 0 : 1200)
    return () => window.clearTimeout(timer)
    // Domain transitions, rather than provider callback identity, own this timer.
  }, [phase, boxId, box?.status, navigate, openBox])
  if (!box || !country) return <FlowState title="Mystery Box not found" onBack={() => navigate('/home')}>Log an eligible meal to earn a box. Check your country progress for available boxes.</FlowState>
  if (box.status === 'opened' && phase !== 'reveal') return <Navigate to={`/boxes/${boxId}/reveal`} replace />
  if (box.status === 'opening' && phase !== 'opening') return <Navigate to={`/boxes/${boxId}/opening`} replace />
  if (box.status === 'ready' && phase !== 'closed') return <Navigate to={`/boxes/${boxId}`} replace />
  const collectible = collectibleDefinitions.find(item => item.id === box.collectibleId)
  return <div className={`flow-page collection-background box-page box-${phase}`} style={{ '--collection-background': `url("${country.background ?? country.image}")` }}>
    <FlowHeader onBack={() => navigate('/home')} onInfo={() => setModal('progress')} />
    <div className="country-title"><h1>{country.flag} {country.name.toUpperCase()}</h1><p>Mystery Box</p></div>
    {phase === 'closed' ? <button type="button" className="box-tap" aria-label="Open Mystery Box" onClick={() => { beginBox(boxId); navigate(`/boxes/${boxId}/opening`) }}><img src={closed} alt="" /><span>Tap to open!</span></button>
      : <img className={`box-picture ${phase === 'opening' ? 'box-animated' : ''}`} src={opening} alt="" />}
    {phase === 'opening' && <p className="sr-only" role="status">Opening your Mystery Box…</p>}
    {phase === 'reveal' && collectible && <div className="box-reveal">
      <img className="box-reveal-glow" src={revealGlow} alt="" />
      <div className="box-reward" role="status"><CollectibleArtwork collectible={collectible} country={country} isUnlocked /><h2 style={{ color: collectible.color }}>{collectible.name.toUpperCase()}</h2><RarityBadge rarity={collectible.rarity} />{box.duplicate && <p>Already in your collection</p>}</div>
      <button type="button" className="collection-pill box-collection" onClick={() => navigate(`/collections/${country.id}`)}>View Collection</button>
    </div>}
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
