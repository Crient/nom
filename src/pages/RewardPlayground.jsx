import { useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExperiencePreviewProvider, useExperience } from '../context/Experience'
import { createExperienceState, experienceReducer } from '../data/experienceState'
import { collectionCountries, collectibleDefinitions, collectibleKey } from '../data/collectionDefinitions'
import CollectibleArtwork, { RarityBadge } from '../components/experience/CollectibleArtwork'
import SurpriseBox from './SurpriseBox'

const previewId = 'qa-preview-box'

function previewState({ countryId, collectibleId }) {
  const state = createExperienceState()
  // The real grant reducer selects the first missing collectible. Arrange only
  // this in-memory collection so it deterministically grants the chosen one.
  state.unlocks = {}
  for (const reward of collectibleDefinitions) {
    if (reward.id === collectibleId) break
    state.unlocks[collectibleKey(countryId, reward.id)] = { source: 'qa-preview' }
  }
  state.boxes = { [previewId]: { id: previewId, countryId, status: 'ready' } }
  return state
}

function Preview({ config, initialPhase }) {
  const [state, dispatch] = useReducer(experienceReducer, config, value => {
    const initial = previewState(value)
    return initialPhase === 'reveal' ? experienceReducer(experienceReducer(initial, { type: 'begin-box', id: previewId }),
      { type: 'open-box', id: previewId, at: new Date().toISOString() }) : initial
  })
  const [phase, setPhase] = useState(initialPhase), [collection, setCollection] = useState(false)
  const actions = useMemo(() => ({
    beginBox: id => dispatch({ type: 'begin-box', id }),
    openBox: id => dispatch({ type: 'open-box', id, at: new Date().toISOString() }),
  }), [])
  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  const country = collectionCountries.find(item => item.id === config.countryId)
  const collectible = collectibleDefinitions.find(item => item.id === config.collectibleId)
  return <ExperiencePreviewProvider value={value}>
    {collection ? <div className="reward-playground-collection"><h2>{country.name} test collectible</h2>
      <CollectibleArtwork country={country} collectible={collectible} isUnlocked /><h3>{collectible.name}</h3><RarityBadge rarity={collectible.rarity} />
      <button type="button" className="hub-action" onClick={() => setCollection(false)}>Back to reveal</button></div>
      : <SurpriseBox boxId={previewId} phase={phase} onPhaseChange={setPhase} onBack={config.onClose} onViewCollection={() => setCollection(true)} />}
  </ExperiencePreviewProvider>
}

export default function RewardPlayground() {
  const { state } = useExperience()
  const earned = Object.values(state.boxes).filter(box => box.status === 'opened' && box.collectibleId)
    .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''))[0]
  const last = useRef(earned ? { countryId: earned.countryId, collectibleId: earned.collectibleId } : null)
  const [countryId, setCountryId] = useState('cambodia'), [preview, setPreview] = useState(null), sequence = useRef(0)
  const [notice, setNotice] = useState('')
  function show(collectibleId, initialPhase = 'closed', country = countryId) {
    const config = { countryId: country, collectibleId }
    last.current = config
    setPreview({ ...config, initialPhase, key: ++sequence.current })
    setNotice('')
  }
  return <main className="reward-playground">
    <Link className="hub-action" to="/profile">← Back to Profile</Link>
    <h1>Reward playground</h1><p>Local development previews. Test rewards do not change your meals, progress, favorites, or collection.</p>
    <div className="reward-playground-controls">
      <label htmlFor="qa-reward-country">Country</label><select id="qa-reward-country" value={countryId} onChange={event => setCountryId(event.target.value)}>
        {collectionCountries.map(country => <option key={country.id} value={country.id}>{country.flag} {country.name}</option>)}
      </select>
      <div className="reward-playground-actions">
        <button type="button" onClick={() => show('ziggy')}>Trigger common reward</button>
        <button type="button" onClick={() => show('fenn')}>Trigger rare reward</button>
        <button type="button" onClick={() => show('nox')}>Trigger epic reward</button>
        <button type="button" onClick={() => show('lumi')}>Trigger legendary reward</button>
        <button type="button" onClick={() => show('ziggy')}>Trigger country mystery box</button>
        <button type="button" disabled={!last.current} onClick={() => show(last.current.collectibleId, 'closed', last.current.countryId)}>Replay last reward animation</button>
        <button type="button" onClick={() => show(last.current?.collectibleId ?? 'lumi', 'reveal')}>Preview collectible reveal</button>
        <button type="button" onClick={() => { last.current = null; setPreview(null); setNotice('Test reward state reset.') }}>Reset test reward state</button>
      </div>
    </div>
    {notice && <p role="status">{notice}</p>}
    {preview && <section className="reward-playground-preview" aria-label="Test reward preview">
      <Preview key={preview.key} config={{ ...preview, onClose: () => setPreview(null) }} initialPhase={preview.initialPhase} />
    </section>}
  </main>
}
