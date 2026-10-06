import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useVisit } from '../hooks/useVisit'
import { useExperience } from '../context/Experience'
import { hasCountedDish, visitDay } from '../data/experienceState'
import { developmentVerificationProvider } from '../data/visitVerificationProvider'
import { FlowCTA, FlowHeader, FlowState, FlowTitle } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import map from '../assets/experience/verify-map.webp'
import shield from '../assets/experience/shield.svg'
import check from '../assets/experience/check.svg'
import clock from '../assets/experience/clock.svg'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'
import verified from '../assets/experience/verified.svg'

export default function VerifyVisit() {
  const { visitId } = useParams(), navigate = useNavigate()
  const { visit, log, dish, restaurant, status, retry } = useVisit(visitId)
  const { state, verifyVisit } = useExperience()
  const [modal, setModal] = useState(null)
  const home = () => navigate('/home')
  if (!visit || !dish) return <FlowState title="Visit not found" onBack={home}>This unfinished visit isn’t saved after a refresh. Start again from a restaurant.</FlowState>
  if (log) return <Navigate to={`/visits/${visitId}/logged`} replace />
  const restaurantRoute = `/recommendations/${dish.id}/nearby/${visit.restaurantId}`
  const back = () => navigate(restaurantRoute, { state: visit.returnState })
  if (status === 'loading') return <FlowState title="Loading visit…" backLabel="Back to restaurant" onBack={back}>Getting the restaurant preview.</FlowState>
  if (!restaurant) return <FlowState title="Restaurant unavailable" onBack={home} onRetry={status === 'error' ? retry : undefined}>Choose a restaurant to start again.</FlowState>
  const proceed = method => {
    verifyVisit(visitId, developmentVerificationProvider.verify({ method }))
    navigate(`/visits/${visitId}/feedback`)
  }
  const attempt = method => {
    if (method !== 'unverified' && hasCountedDish(state, dish.id, visitDay())) { verifyVisit(visitId, developmentVerificationProvider.verify({ method })); setModal('counted') }
    else proceed(method)
  }
  return <div className="flow-page verify-page">
    <FlowHeader onBack={back} onInfo={() => setModal('progress')} />
    <FlowTitle title="Verify Your Visit" subtitle={restaurant.name} />
    {restaurant.source !== 'google-places' && <img className="verify-map" src={map} alt="Illustrated restaurant location preview" />}
    {restaurant.source === 'google-places' && !restaurant.metadataOnly && <GooglePlacesAttribution restaurants={[restaurant]} />}
    <div className="verify-checks">
      {[{ icon: check, title: 'Location check preview',
        text: 'Nearby discovery does not verify your visit.', green: true },
        { icon: clock, title: 'Visit time preview', text: 'No visit duration is measured.' },
        { icon: verified, title: 'All set!', text: `Ready to log ${dish.name}.` }].map(row => <div className={`verify-check ${row.green ? 'verify-check-green' : ''}`} key={row.title}>
          <span><img src={row.icon} alt="" /></span><div><strong>{row.title}</strong><p>{row.text}</p></div>
        </div>)}
    </div>
    <div className="flow-privacy"><img src={shield} alt="" /><p>Visit checks are a preview. No GPS or visit time is being measured. QR and receipt checks are also simulated.</p></div>
    <button type="button" className="verify-alternative" onClick={() => setModal('failed')}>Couldn’t verify automatically?</button>
    <FlowCTA onClick={() => attempt('location-demo')}>Continue</FlowCTA>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} onVerify={attempt} onLogAnyway={() => proceed(visit.verification?.method ?? 'location-demo')}
      onOtherDishes={() => navigate(`${restaurantRoute}#popular-menu`, { state: visit.returnState })} />
  </div>
}
