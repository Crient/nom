import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useVisit } from '../hooks/useVisit'
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

export default function ExperienceLogged() {
  const { visitId } = useParams(), navigate = useNavigate(), location = useLocation()
  const { visit, log, dish, restaurant, status } = useVisit(visitId)
  const { state } = useExperience()
  const [modal, setModal] = useState(null)
  if (!visit || !dish) return <FlowState title="Experience not found" onBack={() => navigate('/home')}>We couldn’t find this saved experience. Go Home to start a new visit.</FlowState>
  if (!log) return <Navigate to={`/visits/${visitId}/${visit.verification ? 'feedback' : 'verify'}`} replace />
  const country = collectionCountries.find(item => item.id === log.countryId)
  return <div className="flow-page logged-page">
    <div className="logged-background"><img src={background} alt="" /></div>
    <div className="logged-illustration"><img src={illustration} alt="" /></div>
    <FlowHeader onBack={() => navigate(recommendationReturnTo(location.state?.returnTo, '/home'))} onInfo={() => setModal('progress')} />
    <div className="logged-copy"><h1>Experience Logged!</h1><p>You enjoyed {dish.name} at<br />{restaurant?.name ?? (status === 'loading' ? 'your restaurant' : 'the selected restaurant')}.</p></div>
    {country && <div className="logged-progress"><CountryProgressCard {...countryProgressPresentation(state, country)} /></div>}
    {log.boxId ? <button type="button" className="logged-unlocked" onClick={() => navigate(`/boxes/${log.boxId}`)}><img src={unlocked} alt="" /><span><strong>You have unlocked your Mystery Box!</strong><small>Tap to discover your reward.</small></span></button>
      : <div className="logged-note" role="status"><p>{log.earnedProgress ? 'One more experience added to your country progress.' : 'Meal saved to your session history. No extra box progress for this meal.'}</p></div>}
    <p className="flow-demo logged-demo">Development experience. Meals and feedback save locally when storage is available.</p>
    <FlowCTA onClick={() => navigate('/home')}>Back to Home</FlowCTA>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
