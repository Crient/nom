import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useDiscoverySession } from '../context/DiscoverySession'
import { useRecommendations } from '../hooks/useRecommendations'
import { surpriseContextKey, surpriseSession } from '../utils/surpriseSession'
import { FlowHeader } from '../components/experience/FlowLayout'
import SurpriseDishCard from '../components/recommendations/SurpriseDishCard'
import Button from '../components/ui/Button'
import SessionChip from '../components/recommendations/SessionChip'
import '../styles/surprise.css'

export default function SurpriseMe() {
  const session = useDiscoverySession(), { ready, results, chips } = useRecommendations(), navigate = useNavigate()
  const [current, setCurrent] = useState(null), [nextResult, setNextResult] = useState(null), [queuedResult, setQueuedResult] = useState(null), [bufferedResult, setBufferedResult] = useState(null), [draw, setDraw] = useState(0), context = surpriseContextKey(session), loaded = useRef(null)
  const prepareDeck = () => { setNextResult(surpriseSession.peek(session, results)); setQueuedResult(surpriseSession.peek(session, results, 1)); setBufferedResult(surpriseSession.peek(session, results, 2)) }
  useEffect(() => {
    if (ready && loaded.current !== context) {
      loaded.current = context; setCurrent(surpriseSession.next(session, results)); prepareDeck()
    }
  }, [ready, context, results, session])
  if (!ready) return <Navigate to="/discover/food-type" replace state={{ surpriseMode: true }} />
  return <div className="flow-page surprise-page">
    <FlowHeader onBack={() => navigate('/home')} />
    <div className="surprise-intro"><h1>Surprise me</h1><p>A little adventure, chosen for your craving.</p>
      <div className="surprise-chips">{chips.map(chip => <SessionChip key={chip.id} chip={chip} />)}</div>
    </div>
    {current ? <>
      <SurpriseDishCard identity={`${context}:${draw}:${current.dish.id}`} result={current} nextResult={nextResult} queuedResult={queuedResult} bufferedResult={bufferedResult} onSkip={() => { setCurrent(surpriseSession.next(session, results)); prepareDeck(); setDraw(value => value + 1) }}
        canUndo={surpriseSession.canGoBack(session)} onUndo={() => {
          const previous = surpriseSession.previous(session, results)
          if (!previous) return
          setCurrent(previous); prepareDeck(); setDraw(value => value + 1)
        }}
        onSelect={() => navigate(`/recommendations/${current.dish.id}`, { state: { returnTo: '/recommendations/surprise' } })} />
      <p className="surprise-hint">← Swipe to skip · Swipe to try →<br />Or use the buttons above.</p>
      <p className="sr-only" role="status" aria-live="polite">Next dish: {current.dish.name}</p>
    </> : <div className="nearby-state"><p>No dishes fit these preferences yet.</p><Button onClick={() => navigate('/discover/food-type')}>Adjust preferences</Button></div>}
  </div>
}
