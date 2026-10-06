import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import AteHereMascot from './AteHereMascot'

export const ATE_CONFIRM_THRESHOLD = 0.85
export default function AteHereSwipe({ onConfirm }) {
  const track = useRef(null), handle = useRef(null), phrase = useRef(null), drag = useRef(null), timer = useRef(null), confirmed = useRef(false)
  const [progress, setProgress] = useState(0), [dragging, setDragging] = useState(false), [armed, setArmed] = useState(false), [complete, setComplete] = useState(false)
  const reduced = useReducedMotion(), [geometry, setGeometry] = useState({ travel: 0, phraseLeft: 0, phraseWidth: 0, mouthOffset: 0, centerOffset: 42 })
  const measure = () => {
    const trackBounds = track.current.getBoundingClientRect(), phraseBounds = phrase.current.getBoundingClientRect()
    const width = handle.current.offsetWidth
    setGeometry({ travel: Math.max(0, track.current.clientWidth - width - 16),
      phraseLeft: phraseBounds.left - trackBounds.left, phraseWidth: phraseBounds.width,
      mouthOffset: 8 + width * .7, centerOffset: 8 + width / 2 })
  }
  const { travel, phraseLeft, phraseWidth, mouthOffset } = geometry
  const mouth = mouthOffset + progress * travel
  const eaten = complete || armed ? 0 : Math.min(phraseWidth, Math.max(0, mouth - phraseLeft))
  useLayoutEffect(() => {
    measure()
    const observer = globalThis.ResizeObserver ? new ResizeObserver(measure) : null
    observer?.observe(track.current)
    observer?.observe(phrase.current)
    globalThis.addEventListener?.('resize', measure)
    return () => { observer?.disconnect(); globalThis.removeEventListener?.('resize', measure) }
  }, [])
  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])
  const confirm = () => {
    if (confirmed.current) return
    confirmed.current = true; setProgress(1); setComplete(true); setDragging(false)
    timer.current = setTimeout(() => onConfirm(), reduced ? 100 : 450)
  }
  const cancel = () => { drag.current = null; setDragging(false); if (!confirmed.current) { setProgress(0); setArmed(false) } }
  const begin = event => {
    if (confirmed.current || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return
    const width = track.current.clientWidth - handle.current.offsetWidth - 16
    if (width <= 0) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, travel: width, progress: 0 }
    measure()
    setProgress(0); setDragging(true); setArmed(false)
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* Pointer capture unavailable. */ }
  }
  const move = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const value = Math.min(1, Math.max(0, (event.clientX - drag.current.x) / drag.current.travel))
    drag.current.progress = value; setProgress(value)
  }
  const end = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    move(event)
    const value = drag.current.progress
    drag.current = null; setDragging(false)
    if (value >= ATE_CONFIRM_THRESHOLD) confirm(); else cancel()
  }
  const keyboard = event => {
    if (event.repeat || confirmed.current) return
    if (event.key === 'Escape') { cancel(); return }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault()
      if (armed) confirm(); else { setArmed(true); setProgress(0) }
    }
  }
  return <div className="restaurant-ate-section">
    <div ref={track} className={`restaurant-ate restaurant-ate-swipe ${dragging ? 'is-dragging' : ''} ${complete ? 'is-complete' : ''}`} data-reduced-motion={reduced} style={{ '--ate-progress': `${progress * 100}%`, '--ate-fill': `${progress === 0 ? 0 : mouth}px`, '--ate-eaten': `${eaten}px`, '--ate-mouth': `${mouth}px`, '--ate-center': `${geometry.centerOffset}px` }}>
      <span className="restaurant-ate-warmth" aria-hidden="true" style={{ transform: `translateX(${progress * travel}px)` }} />
      <span className="restaurant-ate-progress" aria-hidden="true" />
      <span className="restaurant-ate-label" role="status" aria-live="polite"><span ref={phrase} className="restaurant-ate-phrase" style={{ clipPath: `inset(0 0 0 ${eaten}px)` }}>{complete ? '✓ I ate here!' : armed ? 'Press again to confirm' : 'I ate here'}</span><small style={{ opacity: complete || armed ? 1 : Math.max(0, 1 - progress * 3) }}>{complete ? 'Let’s log your meal' : armed ? 'Enter or Space' : 'Swipe to confirm →'}</small></span>
      {dragging && progress > 0 && !reduced && <span className="restaurant-ate-crumbs" aria-hidden="true"><i /><i /><i /></span>}
      <button ref={handle} type="button" className="restaurant-ate-handle" disabled={complete}
        aria-label="I ate here: swipe right, or press Enter twice to confirm" aria-describedby="ate-swipe-help"
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}
        onLostPointerCapture={() => { if (drag.current) cancel() }} onKeyDown={keyboard} onBlur={() => { if (!drag.current && !confirmed.current) { setArmed(false); setProgress(0) } }}
        style={{ transform: `translateX(${progress * travel}px)` }}><AteHereMascot eating={dragging && progress > 0 && !reduced} /></button>
      {complete && <span className="restaurant-ate-celebrate" aria-hidden="true">✦ ✦ ✦</span>}
    </div>
    {!complete && <button type="button" className="restaurant-ate-alternative" onClick={() => { if (armed) confirm(); else setArmed(true) }}>{armed ? 'Confirm I ate here' : 'Use a button instead'}</button>}
    <p id="ate-swipe-help" className="sr-only">Drag the eating Nom character to the right and release to confirm. With a keyboard, press Enter or Space twice. Press Escape to cancel.</p>
  </div>
}
