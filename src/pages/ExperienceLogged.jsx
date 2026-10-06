import { useState } from 'react'
import { ExperienceNavigate as Navigate, useExperienceRoute } from '../context/ExperienceFlow'
import { useVisit } from '../hooks/useVisit'
import { useAuth } from '../context/Auth'
import { useExperience } from '../context/Experience'
import { collectionCountries } from '../data/collectionDefinitions'
import { countryProgressPresentation } from '../utils/experienceProgress'
import CountryProgressCard from '../components/ui/CountryProgressCard'
import { FlowCTA, FlowHeader, FlowState } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import background from '../assets/experience/logged-background.webp'
import illustration from '../assets/experience/logged-illustration.webp'
import unlocked from '../assets/experience/box-unlocked.webp'
import { recommendationReturnTo } from '../utils/navigation'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'

export default function ExperienceLogged() {
  const { params: { visitId }, navigate, location, testMode } = useExperienceRoute()
  const { visit, log, dish, restaurant, status } = useVisit(visitId)
  const { state } = useExperience()
  const auth = useAuth()
  const [modal, setModal] = useState(null)
  if (!visit || !dish) return <FlowState title="Experience not found" onBack={() => navigate('/home')}>We couldn’t find this saved experience. Go Home to start a new visit.</FlowState>
  if (!log) return <Navigate to={`/visits/${visitId}/${visit.verification ? 'feedback' : 'verify'}`} replace />
  const country = collectionCountries.find(item => item.id === log.countryId)
  return <div className="flow-page logged-page">
    <div className="logged-background"><img src={background} alt="" /></div>
    <div className="logged-illustration"><img src={illustration} alt="" /></div>
    <FlowHeader onBack={() => navigate(recommendationReturnTo(location.state?.returnTo, '/home'))} onInfo={() => setModal('progress')} />
    <div className="logged-copy"><h1>Experience Logged!</h1><p>You enjoyed {dish.name} at<br />{restaurant?.name ?? (status === 'loading' ? 'your restaurant' : 'the selected restaurant')}.</p></div>
    {restaurant?.source === 'google-places' && !restaurant.metadataOnly && <GooglePlacesAttribution restaurants={[restaurant]} />}
    {country && <div className="logged-progress"><CountryProgressCard {...countryProgressPresentation(state, country)} /></div>}
    {log.boxId ? <button type="button" className="logged-unlocked" onClick={() => navigate(`/boxes/${log.boxId}`)}><img src={unlocked} alt="" /><span><strong>You have unlocked your Mystery Box!</strong><small>Tap to discover your reward.</small></span></button>
      : <div className="logged-note" role="status"><p>{log.earnedProgress ? 'One more experience added to your country progress.' : 'Meal saved to your session history. No extra box progress for this meal.'}</p></div>}
    <p className="flow-demo logged-demo">{testMode ? 'Test meal saved in memory only. Leaving this playground discards it.' : auth.isAuthenticated ? 'Meal saved to your account journey. Sync continues when connected.' : 'Meals and feedback save on this device when storage is available.'}</p>
    <FlowCTA onClick={() => navigate('/home')}>Back to Home</FlowCTA>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
