import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccountSync } from '../context/LocalData'
import { randomSurpriseContext, randomSurpriseResults, surpriseQuery } from '../utils/surpriseStrategy'
import { surpriseContextKey, surpriseSession } from '../utils/surpriseSession'
import { FlowHeader } from '../components/experience/FlowLayout'
import SurpriseDishCard from '../components/recommendations/SurpriseDishCard'
import Button from '../components/ui/Button'
import '../styles/surprise.css'

export default function SurpriseMe() {
  const { scope = 'guest' } = useAccountSync(), navigate = useNavigate()
  const session = useMemo(() => ({ ...randomSurpriseContext, recommendationSeed: scope }), [scope]), results = randomSurpriseResults
  const [current, setCurrent] = useState(null), [nextResult, setNextResult] = useState(null), [queuedResult, setQueuedResult] = useState(null), [bufferedResult, setBufferedResult] = useState(null), [draw, setDraw] = useState(0), context = surpriseContextKey(session), loaded = useRef(null)
  const prepareDeck = () => { setNextResult(surpriseSession.peek(session, results)); setQueuedResult(surpriseSession.peek(session, results, 1)); setBufferedResult(surpriseSession.peek(session, results, 2)) }
  useEffect(() => {
    if (loaded.current !== context) {
      // The deck is transient. Switching identities cannot inherit an undo stack.
      if (loaded.current !== null) surpriseSession.reset()
      loaded.current = context; setCurrent(surpriseSession.next(session, results)); prepareDeck()
    }
  }, [context, results, session])
  return <div className="flow-page surprise-page">
    <FlowHeader onBack={() => navigate('/home')} />
    <div className="surprise-intro"><h1>Surprise me</h1><p>A random adventure from all 201 dishes.</p></div>
    {current ? <>
      <SurpriseDishCard identity={`${context}:${draw}:${current.dish.id}`} result={current} nextResult={nextResult} queuedResult={queuedResult} bufferedResult={bufferedResult} onSkip={() => { setCurrent(surpriseSession.next(session, results)); prepareDeck(); setDraw(value => value + 1) }}
        canUndo={surpriseSession.canGoBack(session)} onUndo={() => {
          const previous = surpriseSession.previous(session, results)
          if (!previous) return
          setCurrent(previous); prepareDeck(); setDraw(value => value + 1)
        }}
        onSelect={() => navigate(`/recommendations/${current.dish.id}${surpriseQuery}`, { state: { returnTo: '/recommendations/surprise' } })} />
      <p className="surprise-hint">← Swipe to skip · Swipe to try →<br />Or use the buttons above.</p>
      <p className="sr-only" role="status" aria-live="polite">Next dish: {current.dish.name}</p>
    </> : <div className="nearby-state"><p>No dishes are available right now.</p><Button onClick={() => navigate('/home')}>Back to Home</Button></div>}
  </div>
}
