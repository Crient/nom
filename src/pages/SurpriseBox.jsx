import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { recommendationReturnTo } from '../utils/navigation'
import { unlockedCount } from '../utils/experienceProgress'
import { countrySceneProps } from '../utils/countryScene'
import { rewardSound, rewardSoundEnabled, saveRewardSoundPreference } from '../utils/rewardSound'
import { useExperience } from '../context/Experience'
import useReducedMotion from '../hooks/useReducedMotion'
import { collectionCountries, collectibleDefinitions, collectibleKey } from '../data/collectionDefinitions'
import { FlowHeader, FlowState } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import closed from '../assets/experience/box-closed.webp'
import opening from '../assets/experience/box-open.webp'

export const BOX_REVEAL_TIMING = { energy: 300, pop: 550, silhouette: 600, reward: 950, rarity: 1050, progress: 1250, settle: 1550 }
export const BOX_REDUCED_TIMING = { energy: 20, pop: 40, silhouette: 70, reward: 100, rarity: 130, progress: 170, settle: 220 }
const stageOrder = ['anticipation', 'energy', 'pop', 'silhouette', 'reward', 'rarity', 'progress', 'settled']

export default function SurpriseBox({ phase = 'closed', boxId: previewBoxId, onPhaseChange, onBack, onViewCollection }) {
  const { boxId: routeBoxId } = useParams(), navigate = useNavigate(), location = useLocation()
  const boxId = previewBoxId ?? routeBoxId
  const { state, beginBox, openBox } = useExperience(), reduced = useReducedMotion()
  const [modal, setModal] = useState(null), [stage, setStage] = useState('anticipation')
  const [soundOn, setSoundOn] = useState(rewardSoundEnabled), [soundNotice, setSoundNotice] = useState(() => location.state?.rewardSoundUnavailable ? 'Sound is unavailable. Your reward will still open.' : null)
  const pressed = useRef(false), soundHandoff = useRef(false), soundCleanup = useRef(null), sequence = useRef(null), route = useRef({ boxId, phase })
  const previewPhase = useRef(onPhaseChange)
  previewPhase.current = onPhaseChange
  route.current = { boxId, phase }
  const box = state.boxes[boxId], country = collectionCountries.find(item => item.id === box?.countryId)
  useEffect(() => {
    const key = `${boxId}:${phase}`
    if (soundCleanup.current?.key === key) clearTimeout(soundCleanup.current.timer)
    if (phase !== 'closed') soundHandoff.current = false
    else pressed.current = false
    return () => {
      // A same-route StrictMode effect replay cancels this cleanup immediately.
      if (!soundHandoff.current) soundCleanup.current = { key, timer: setTimeout(() => rewardSound.stop(), 0) }
    }
  }, [boxId, phase])
  useEffect(() => {
    if (!soundOn || reduced) rewardSound.stop()
    setSoundNotice(soundOn && reduced ? 'Sound is paused with reduced motion.'
      : location.state?.rewardSoundUnavailable ? 'Sound is unavailable. The visual reveal works without it.' : null)
  }, [soundOn, reduced, location.state?.rewardSoundUnavailable])
  useEffect(() => {
    if (phase !== 'opening' || (box?.status !== 'opening' && sequence.current !== boxId)) return
    sequence.current = boxId
    const timing = reduced ? BOX_REDUCED_TIMING : BOX_REVEAL_TIMING
    setStage('anticipation')
    const timers = stageOrder.slice(1, -1).map(next => setTimeout(() => {
      if (next === 'silhouette') openBox(boxId)
      setStage(next)
    }, timing[next]))
    timers.push(setTimeout(() => {
      // Let longer rarity tails finish across the natural opening -> reveal route.
      // Leaving the reveal screen or muting still stops playback immediately.
      soundHandoff.current = true
      setStage('settled')
      if (previewPhase.current) previewPhase.current('reveal')
      else navigate(`/boxes/${boxId}/reveal`, { replace: true, state: location.state })
    }, timing.settle))
    return () => {
      timers.forEach(clearTimeout)
      if (route.current.phase !== 'opening' || route.current.boxId !== boxId) sequence.current = null
    }
    // The route owns presentation timers; the guarded domain grant must not restart them.
  }, [phase, boxId, reduced, navigate, openBox, location.state])
  if (!box || !country) return <FlowState title="Mystery Box not found" onBack={() => navigate('/home')}>Log an eligible meal to earn a box. Check your country progress for available boxes.</FlowState>
  if (box.status === 'opened' && phase === 'closed') return <Navigate to={`/boxes/${boxId}/reveal`} replace state={location.state} />
  if (box.status === 'opening' && phase !== 'opening' && !pressed.current) return <Navigate to={`/boxes/${boxId}/opening`} replace state={location.state} />
  if (box.status === 'opened' && phase === 'opening' && sequence.current !== boxId) return <Navigate to={`/boxes/${boxId}/reveal`} replace state={location.state} />
  if (box.status === 'ready' && phase !== 'closed') return <Navigate to={`/boxes/${boxId}`} replace state={location.state} />
  const collectible = collectibleDefinitions.find(item => item.id === box.collectibleId), revealed = !!collectible && box.status === 'opened'
  // Pre-mount the deterministic reward artwork while the box is closed. This is
  // presentation only; the existing guarded openBox action still owns the grant.
  const artwork = collectible ?? collectibleDefinitions.find(item => !state.unlocks[collectibleKey(country.id, item.id)]) ?? collectibleDefinitions[0]
  const presentation = phase === 'reveal' ? 'settled' : stage, rank = stageOrder.indexOf(presentation)
  const popped = phase !== 'closed' && rank >= 2, characterVisible = revealed && rank >= 3, resolved = rank >= 4
  const identityVisible = revealed && rank >= 5, progressVisible = revealed && rank >= 5, settled = presentation === 'settled'
  const collected = unlockedCount(state, country.id), previous = collected - (revealed && !box.duplicate ? 1 : 0)
  const displayCount = rank >= 6 ? collected : Math.max(0, previous)
  const scene = countrySceneProps(country)
  return <div {...scene} className={`flow-page box-page box-${phase} ${scene.className}`} data-reduced-motion={reduced}
    style={{ ...scene.style, '--reward-accent': artwork.color, '--box-duration': `${BOX_REVEAL_TIMING.settle}ms` }}>
    <FlowHeader onBack={onBack ?? (() => navigate(recommendationReturnTo(location.state?.returnTo, '/home'), { state: { returnTo: recommendationReturnTo(location.state?.countryReturnTo, '/collections') } }))} onInfo={() => setModal('progress')} />
    <div className="country-title"><h1>{country.flag} {country.name.toUpperCase()}</h1><p>Mystery Box</p></div>
    <div className="box-sound-row"><button type="button" className="box-sound-toggle" aria-pressed={soundOn} onClick={() => {
      const enabled = !soundOn; setSoundOn(enabled); saveRewardSoundPreference(enabled)
      if (!enabled) rewardSound.stop()
      setSoundNotice(reduced && enabled ? 'Sound is paused with reduced motion.' : null)
    }}>{soundOn ? '♫ Sound on' : '♪ Sound off'}</button>
      {soundNotice && <p className="box-sound-notice" role="status">{soundNotice}</p>}
    </div>
    <div className={`box-scene box-stage-${presentation}`} data-stage={presentation}
      style={{ '--box-progress-before': Math.max(0, previous) / collectibleDefinitions.length, '--box-progress-after': collected / collectibleDefinitions.length }}>
      <div className="box-theatre">
        <div className="box-aura" aria-hidden="true" />
        <div className={`box-gift ${popped ? 'is-open' : ''} ${characterVisible ? 'is-retired' : ''}`} aria-hidden="true">
          <div className="box-gift-art">
            <img className="box-scene-closed" src={closed} alt="" />
            <img className="box-scene-body" src={opening} alt="" />
            <img className="box-scene-lid" src={opening} alt="" />
          </div>
        </div>
        <div className="box-sparkles" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => {
          const angle = Math.PI / 4 + index * Math.PI / 2
          return <i key={index} style={{ '--spark-x': `${Math.round(Math.cos(angle) * 100)}px`, '--spark-y': `${Math.round(Math.sin(angle) * 90)}px` }}>✦</i>
        })}</div>
        <div className={`box-character ${characterVisible ? 'is-visible' : ''} ${resolved ? 'is-resolved' : 'is-silhouette'}`} aria-hidden={!resolved}>
          <div className="box-character-silhouette" aria-hidden="true"><CollectibleArtwork collectible={artwork} country={country} isUnlocked /></div>
          <div className="box-character-color"><CollectibleArtwork collectible={artwork} country={country} isUnlocked /></div>
        </div>
        {phase === 'closed' && <button type="button" className="box-tap" aria-label="Open Mystery Box" onClick={() => {
          if (pressed.current) return
          pressed.current = true
          const rewardSoundUnavailable = soundOn && !reduced && !rewardSound.play({ enabled: soundOn, reducedMotion: reduced, delayMs: BOX_REVEAL_TIMING.reward, rarity: artwork.rarity })
          if (rewardSoundUnavailable) setSoundNotice('Sound is unavailable. Your reward will still open.')
          soundHandoff.current = true; beginBox(boxId)
          if (previewPhase.current) previewPhase.current('opening')
          else navigate(`/boxes/${boxId}/opening`, { state: { ...location.state, rewardSoundUnavailable } })
        }}><span>Tap to discover</span></button>}
      </div>
      {phase === 'opening' && <p className="sr-only" role="status">{resolved && collectible ? `${collectible.name} discovered, ${collectible.rarity} collectible.` : 'Opening your Mystery Box…'}</p>}
      <div className={`box-reward ${identityVisible ? 'is-visible' : ''}`} aria-hidden={!identityVisible}>
        {collectible && <><p className="box-reward-kicker">{box.duplicate ? 'A familiar friend' : 'New collectible discovered'}</p>
          <h2>{collectible.name.toUpperCase()}</h2><RarityBadge rarity={collectible.rarity} />
          <p>{country.name}{box.duplicate && ' · Already in your collection'}</p></>}
      </div>
      <div className={`box-collection-progress ${progressVisible ? 'is-visible' : ''}`} aria-hidden={!progressVisible}>
        <p>{displayCount} / {collectibleDefinitions.length} collectibles collected</p>
        <div role="progressbar" aria-label={`${country.name} collectibles`} aria-valuemin={0} aria-valuemax={collectibleDefinitions.length} aria-valuenow={displayCount}>
          <span style={{ transform: `scaleX(${displayCount / collectibleDefinitions.length})` }} />
        </div>
      </div>
      <button type="button" className={`collection-pill box-collection ${settled ? 'is-visible' : ''}`} disabled={!settled} aria-hidden={!settled}
        onClick={onViewCollection ?? (() => navigate(`/collections/${country.id}`, { state: { returnTo: recommendationReturnTo(location.state?.countryReturnTo ?? location.state?.returnTo, '/collections') } }))}>View Collection</button>
    </div>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
