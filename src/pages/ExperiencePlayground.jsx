import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExperiencePreviewProvider } from '../context/Experience'
import { ExperienceFlowContext } from '../context/ExperienceFlow'
import { FavoritesPreviewProvider } from '../context/Favorites'
import { createExperienceState, experienceReducer, visitDay } from '../data/experienceState'
import { BOX_TARGET } from '../data/collectionDefinitions'
import { dishes } from '../data/dishes'
import { mockRestaurants } from '../data/mockRestaurants'
import { developmentVerificationProvider } from '../data/visitVerificationProvider'
import RestaurantDetails from './RestaurantDetails'
import VerifyVisit from './VerifyVisit'
import MealFeedback from './MealFeedback'
import ExperienceLogged from './ExperienceLogged'
import SurpriseBox from './SurpriseBox'

const dish = dishes.find(item => item.id === 'lort-cha')
const restaurant = { ...mockRestaurants.find(item => item.id === 'preview-thmor-da'), source: 'qa-fixture' }
const restaurantPath = `/recommendations/${dish.id}/nearby/${restaurant.id}`
const visitId = 'qa-experience-visit'
const scenarios = [
  ['restaurant', 'Mock Restaurant Detail'], ['restaurant', 'I Ate Here animation / start visit'],
  ['verify', 'Verify Your Visit'], ['verified', 'Successful location-demo verification'],
  ['manual', 'Manual / unverified path'], ['failed', 'Verification failed modal'],
  ['counted', 'Already counted today'], ['feedback', 'Meal Feedback'],
  ['earned', 'Experience Logged — earned progress'], ['no-progress', 'Experience Logged — no progress'],
  ['unlocked', 'Mystery Box unlocked'],
]

function draft(id = visitId) {
  return { id, dishId: dish.id, restaurantId: restaurant.id, countryCode: dish.countryCode,
    startedAt: new Date().toISOString(), returnState: {}, verification: null, feedback: null }
}

function fixture(mode) {
  let state = createExperienceState()
  state.progress.cambodia = { meals: 0, count: mode === 'unlocked' ? BOX_TARGET - 1 : 0 }
  const apply = action => { state = experienceReducer(state, action) }
  const verify = id => apply({ type: 'verify', id, verification: developmentVerificationProvider.verify({ method: 'location-demo' }) })
  const feedback = id => apply({ type: 'feedback', id, feedback: { reaction: 'loved', observations: [], note: '' } })
  const complete = id => apply({ type: 'complete', id, day: visitDay(), at: new Date().toISOString() })
  if (mode === 'counted') {
    apply({ type: 'start', draft: draft('qa-counted-earlier') }); verify('qa-counted-earlier'); feedback('qa-counted-earlier'); complete('qa-counted-earlier')
  }
  if (mode !== 'restaurant') apply({ type: 'start', draft: draft() })
  const isFeedback = ['verified', 'manual', 'feedback', 'earned', 'no-progress', 'unlocked'].includes(mode)
  if (isFeedback) apply({ type: 'verify', id: visitId, verification: developmentVerificationProvider.verify({ method: ['manual', 'no-progress'].includes(mode) ? 'unverified' : 'location-demo' }) })
  const logged = ['earned', 'no-progress', 'unlocked'].includes(mode)
  if (logged) { feedback(visitId); complete(visitId) }
  return { state, path: mode === 'restaurant' ? restaurantPath : `/visits/${visitId}/${logged ? 'logged' : isFeedback ? 'feedback' : 'verify'}` }
}

function Preview({ mode, onClose }) {
  const [initial] = useState(() => fixture(mode))
  const [state, dispatch] = useReducer(experienceReducer, initial.state)
  const [location, setLocation] = useState({ pathname: initial.path, hash: '', state: null })
  const [favorites, setFavorites] = useState([]), [notice, setNotice] = useState('')
  const sequence = useRef(0)
  const navigate = useCallback((to, options = {}) => {
    const [pathname, hash = ''] = to.split('#')
    if (pathname === '/home' || pathname === `/recommendations/${dish.id}/nearby`) { onClose(); return }
    if (!pathname.startsWith('/visits/') && !pathname.startsWith('/boxes/') && pathname !== restaurantPath) {
      setNotice('This action is simulated in test mode.'); return
    }
    setNotice('')
    setLocation({ pathname, hash: hash ? `#${hash}` : '', state: options.state ?? null })
  }, [onClose])
  const actions = useMemo(() => ({
    startVisit() { const id = `qa-started-${++sequence.current}`; dispatch({ type: 'start', draft: draft(id) }); return id },
    verifyVisit: (id, verification) => dispatch({ type: 'verify', id, verification }),
    saveFeedback: (id, feedback) => dispatch({ type: 'feedback', id, feedback }),
    completeVisit: id => dispatch({ type: 'complete', id, day: visitDay(), at: new Date().toISOString() }),
    beginBox: id => dispatch({ type: 'begin-box', id }),
    openBox: id => dispatch({ type: 'open-box', id, at: new Date().toISOString() }),
  }), [])
  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  const favoriteValue = useMemo(() => ({
    isRestaurantFavorite: id => favorites.includes(id),
    toggleRestaurantFavorite: id => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
  }), [favorites])
  const [, routeVisitId, visitPage] = location.pathname.match(/^\/visits\/([^/]+)\/(verify|feedback|logged)$/) ?? []
  const [, boxId, boxPhase] = location.pathname.match(/^\/boxes\/([^/]+)(?:\/(opening|reveal))?$/) ?? []
  const route = useMemo(() => ({ testMode: true, restaurant, navigate, location,
    params: { dishId: dish.id, restaurantId: restaurant.id, visitId: routeVisitId },
    initialModal: mode === 'failed' && visitPage === 'verify' ? 'failed' : null,
  }), [navigate, location, routeVisitId, mode, visitPage])
  return <ExperiencePreviewProvider value={value}><FavoritesPreviewProvider value={favoriteValue}><ExperienceFlowContext.Provider value={route}>
    {notice && <p role="status">{notice}</p>}
    {boxId ? <SurpriseBox key={boxId} boxId={boxId} phase={boxPhase ?? 'closed'} persistSoundPreference={false}
      onPhaseChange={phase => navigate(`/boxes/${boxId}${phase === 'closed' ? '' : `/${phase}`}`)}
      onBack={() => navigate(`/visits/${visitId}/logged`)} onViewCollection={() => setNotice('Test collectible added in memory only.')} />
      : visitPage === 'verify' ? <VerifyVisit key={`${routeVisitId}:verify`} />
        : visitPage === 'feedback' ? <MealFeedback />
          : visitPage === 'logged' ? <ExperienceLogged /> : <RestaurantDetails />}
  </ExperienceFlowContext.Provider></FavoritesPreviewProvider></ExperiencePreviewProvider>
}

export default function ExperiencePlayground() {
  const [preview, setPreview] = useState(null), sequence = useRef(0)
  const close = useCallback(() => setPreview(null), [])
  return <main className="reward-playground experience-playground">
    <Link className="hub-action" to="/profile">← Back to Profile</Link>
    <h1>Experience flow playground</h1>
    <p role="status">Test mode — does not change your Nom progress.</p>
    <p>Local Lort Cha and Cambodian restaurant fixtures. Leaving or reloading discards test meals, favorites, boxes and rewards.</p>
    <div className="reward-playground-controls reward-playground-actions">
      {scenarios.map(([mode, label]) => <button type="button" key={label} onClick={() => setPreview({ mode, key: ++sequence.current })}>{label}</button>)}
      <button type="button" onClick={close}>Reset test experience</button>
    </div>
    {preview && <section className="reward-playground-preview" aria-label="Test experience preview">
      <button type="button" className="hub-action" onClick={close}>Close test preview</button>
      <Preview key={preview.key} mode={preview.mode} onClose={close} />
    </section>}
  </main>
}
