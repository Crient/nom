import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useVisit } from '../hooks/useVisit'
import { useExperience } from '../context/Experience'
import { restaurantPresentation } from '../data/restaurantDetails'
import { feedbackReactions, feedbackObservations } from '../data/mealFeedback'
import RestaurantPhoto from '../components/restaurants/RestaurantPhoto'
import FilterChip from '../components/ui/FilterChip'
import { FlowCTA, FlowHeader, FlowState, FlowTitle } from '../components/experience/FlowLayout'
import EdgeStateModal from '../components/experience/EdgeStateModal'
import loved from '../assets/experience/loved.webp'
import liked from '../assets/experience/liked.webp'
import okay from '../assets/experience/okay.webp'
import notForMe from '../assets/experience/not-for-me.webp'
import shield from '../assets/experience/shield.svg'
import GooglePlacesAttribution from '../components/restaurants/GooglePlacesAttribution'

const REACTION_IMAGES = { loved, liked, okay, 'not-for-me': notForMe }

export default function MealFeedback() {
  const { visitId } = useParams(), navigate = useNavigate()
  const { visit, log, dish, restaurant, status, retry } = useVisit(visitId)
  const { saveFeedback, completeVisit } = useExperience()
  const [modal, setModal] = useState(null)
  const home = () => navigate('/home')
  if (!visit || !dish) return <FlowState title="Visit not found" onBack={home}>Start a visit from a restaurant.</FlowState>
  if (log) return <Navigate to={`/visits/${visitId}/logged`} replace />
  if (!visit.verification) return <Navigate to={`/visits/${visitId}/verify`} replace />
  if (status === 'loading') return <FlowState title="Loading feedback…" onBack={home}>Getting your visit.</FlowState>
  if (!restaurant) return <FlowState title="Restaurant unavailable" onBack={home} onRetry={status === 'error' ? retry : undefined}>Choose a restaurant to start again.</FlowState>
  const feedback = visit.feedback ?? { reaction: null, observations: [], note: '' }, presentation = restaurantPresentation(restaurant, dish)
  const update = changes => saveFeedback(visitId, { ...feedback, ...changes })
  return <div className="flow-page feedback-page">
    <FlowHeader onBack={() => navigate(`/visits/${visitId}/verify`)} onInfo={() => setModal('feedback')} />
    <FlowTitle title="How was your meal?" subtitle={restaurant.name} />
    <RestaurantPhoto src={presentation.image} alt={restaurant.source === 'google-places' ? `${dish.name} — Nom dish image` : restaurant.name} cropped={presentation.imageCrop} className="feedback-photo" />
    {restaurant.source === 'google-places' && <><p className="flow-demo">Nom dish image</p>{!restaurant.metadataOnly && <GooglePlacesAttribution restaurants={[restaurant]} />}</>}
    <div className="feedback-reactions" role="group" aria-label="How was your meal?">{feedbackReactions.map(reaction => <button type="button" key={reaction.id} aria-pressed={feedback.reaction === reaction.id} onClick={() => update({ reaction: reaction.id })}>
      <img src={REACTION_IMAGES[reaction.id]} alt="" /><span>{reaction.label}</span>
    </button>)}</div>
    <button type="button" className="flow-privacy feedback-privacy" onClick={() => setModal('feedback')} aria-label="Why we ask for feedback"><img src={shield} alt="" /><span>Save what you enjoyed for future food adventures.<br /><br />Be honest—your feedback won’t affect Mystery Box progress.</span></button>
    <section className="feedback-observations"><h2>What stood out?</h2><div>{feedbackObservations.map(tag => <FilterChip key={tag} selected={feedback.observations.includes(tag)} onClick={() => update({ observations: feedback.observations.includes(tag) ? feedback.observations.filter(item => item !== tag) : [...feedback.observations, tag] })}>{tag}</FilterChip>)}</div></section>
    <div className="feedback-note"><label htmlFor="meal-note">Add a note (optional)</label><textarea id="meal-note" placeholder="Share your thoughts…" value={feedback.note} maxLength={1000} onChange={event => update({ note: event.target.value })} /></div>
    <p className="flow-demo feedback-demo">Logging {dish.name} • {visit.verification.verified ? 'Preview verification' : 'Unverified — no box progress'}</p>
    <FlowCTA disabled={!feedback.reaction} onClick={() => { completeVisit(visitId); navigate(`/visits/${visitId}/logged`) }}>Continue</FlowCTA>
    <EdgeStateModal kind={modal} onClose={() => setModal(null)} />
  </div>
}
