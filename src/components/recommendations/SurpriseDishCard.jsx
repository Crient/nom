import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'
import Image from '../ui/Image'
import DishTitle from '../ui/DishTitle'
import Button from '../ui/Button'

export const surpriseSwipeThreshold = width => Math.max(80, width * .25)
export const SURPRISE_EXIT_MS = 240

// Hash the occurrence once; never consume recommendation randomness on render.
const deckSlot = (id, key) => {
  let hash = 2166136261
  for (const char of `${id}:${key}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return { id, key, tilt: Number((((hash >>> 0) / 4294967295 * 5) - 2.5).toFixed(2)) }
}
const rearTilt = slot => Number((-slot.tilt * .55).toFixed(2))

function reconcileDeck(deck, identity, result, nextResult, queuedResult, bufferedResult) {
  if (deck.identity === identity && deck.front.id === result.dish.id && deck.rear?.id === nextResult?.dish.id
    && deck.queued?.id === queuedResult?.dish.id && deck.buffered?.id === bufferedResult?.dish.id) return deck
  let sequence = deck.sequence
  const front = deck.rear?.id === result.dish.id ? deck.rear
    : deck.front.id === result.dish.id ? deck.front : deckSlot(result.dish.id, sequence++)
  const available = [deck.rear, deck.queued, deck.buffered].filter(slot => slot && slot !== front)
  const take = item => {
    if (!item) return null
    const index = available.findIndex(slot => slot.id === item.dish.id)
    return index >= 0 ? available.splice(index, 1)[0] : deckSlot(item.dish.id, sequence++)
  }
  // Each occurrence has its own key, including two-dish cycles. An outgoing
  // front is never recycled from offscreen into a rear position.
  const rear = take(nextResult), queued = take(queuedResult), buffered = take(bufferedResult)
  return { identity, sequence, front, rear, queued, buffered }
}

export default function SurpriseDishCard({ result, nextResult, queuedResult, bufferedResult, onSkip, onSelect, onUndo, canUndo = false, identity = result.dish.id }) {
  const card = useRef(null), drag = useRef(null), timer = useRef(null), busy = useRef(false), reduced = useReducedMotion()
  const motionIdentity = useRef(identity)
  const [x, setX] = useState(0), [dragging, setDragging] = useState(false), [exit, setExit] = useState(null)
  const [storedDeck, setDeck] = useState(() => ({ identity, sequence: 4,
    front: deckSlot(result.dish.id, 0), rear: nextResult ? deckSlot(nextResult.dish.id, 1) : null,
    queued: queuedResult ? deckSlot(queuedResult.dish.id, 2) : null,
    buffered: bufferedResult ? deckSlot(bufferedResult.dish.id, 3) : null }))
  // Project the next slots without changing state. Even the first commit after
  // a draw keeps each mounted image paired with its original occurrence.
  const deck = reconcileDeck(storedDeck, identity, result, nextResult, queuedResult, bufferedResult)
  useLayoutEffect(() => {
    setDeck(deck => reconcileDeck(deck, identity, result, nextResult, queuedResult, bufferedResult))
  }, [identity, result.dish.id, nextResult?.dish.id, queuedResult?.dish.id, bufferedResult?.dish.id])
  useEffect(() => () => clearTimeout(timer.current), [])
  useLayoutEffect(() => {
    motionIdentity.current = identity
    clearTimeout(timer.current); drag.current = null; busy.current = false
    setX(0); setDragging(false); setExit(null)
  }, [identity])
  const cancel = () => { drag.current = null; setDragging(false); if (!busy.current) setX(0) }
  const choose = direction => {
    if (busy.current || (direction === 'previous' && !canUndo)) return
    if (direction === 'previous') { cancel(); onUndo?.(); return }
    busy.current = true; drag.current = null; setDragging(false); setExit(direction)
    setX((direction === 'skip' ? -1 : 1) * Math.max(400, card.current.clientWidth * 1.4))
    timer.current = setTimeout(() => {
      if (direction === 'skip') onSkip(); else onSelect()
    }, reduced ? 0 : SURPRISE_EXIT_MS)
  }
  const begin = event => {
    if (busy.current || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, delta: 0 }
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* Optional platform support. */ }
  }
  const move = event => {
    const pointer = drag.current
    if (!pointer || pointer.id !== event.pointerId) return
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y
    if (!pointer.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) pointer.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    if (pointer.axis !== 'horizontal') return
    pointer.delta = dx; setDragging(true); setX(dx)
  }
  const end = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return
    move(event)
    const { axis, delta } = drag.current
    drag.current = null; setDragging(false)
    if (axis === 'horizontal' && Math.abs(delta) >= surpriseSwipeThreshold(card.current.clientWidth)) choose(delta < 0 ? 'skip' : 'select')
    else cancel()
  }
  const currentMotion = motionIdentity.current === identity
  const offset = currentMotion ? x : 0, outgoing = currentMotion ? exit : null, isDragging = currentMotion && dragging
  const amount = Math.min(1, Math.abs(offset) / surpriseSwipeThreshold(card.current?.clientWidth ?? 320))
  const promotion = outgoing === 'skip' ? 1 : !outgoing ? Math.min(1, Math.abs(offset) / Math.max(400, (card.current?.clientWidth ?? 320) * 1.4)) : 0
  const cards = [{ slot: deck.front, item: result, role: 'front' },
    ...(deck.rear && nextResult ? [{ slot: deck.rear, item: nextResult, role: 'rear' }] : []),
    ...(deck.queued && queuedResult ? [{ slot: deck.queued, item: queuedResult, role: 'queued' }] : []),
    ...(deck.buffered && bufferedResult ? [{ slot: deck.buffered, item: bufferedResult, role: 'buffered' }] : [])]
    // Keep DOM/compositor order stable on promotion, not just React keys.
    .sort((a, b) => a.slot.key - b.slot.key)
  return <>
    <div className="surprise-card-stack" data-reduced-motion={reduced}>
      {cards.map(({ slot, item, role }) => {
        const front = role === 'front'
        const transform = front ? `translateX(${offset}px) translateY(0px) scale(1) rotate(${reduced ? 0 : slot.tilt + Math.max(-7, Math.min(7, offset / 24))}deg)`
          : role === 'rear' ? `translateX(0px) translateY(${reduced ? -14 : -20 * (1 - promotion)}px) scale(${reduced ? .96 : .96 + .04 * promotion}) rotate(${reduced ? 0 : Number((rearTilt(slot) + (slot.tilt - rearTilt(slot)) * promotion).toFixed(2))}deg)`
          : role === 'queued' ? `translateX(0px) translateY(${reduced ? -14 : -20}px) scale(${reduced ? .92 : Number((.92 + .04 * promotion).toFixed(3))}) rotate(${reduced ? 0 : Number((rearTilt(deck.rear ?? slot) + (rearTilt(slot) - rearTilt(deck.rear ?? slot)) * promotion).toFixed(2))}deg)`
          : `translateX(0px) translateY(${reduced ? -14 : -20}px) scale(${reduced ? .88 : Number((.88 + .04 * promotion).toFixed(3))}) rotate(${reduced ? 0 : rearTilt(deck.queued ?? slot)}deg)`
        return <article key={slot.key} ref={front ? card : null}
        className={`surprise-deck-card ${front ? 'surprise-dish-card' : role === 'rear' ? 'surprise-next-card' : role === 'queued' ? 'surprise-queued-card' : 'surprise-buffered-card'} ${isDragging ? 'is-dragging' : ''} ${front && outgoing ? 'is-exiting' : ''}`}
        aria-label={front ? item.dish.name : undefined} aria-hidden={front ? undefined : true} data-reduced-motion={reduced} data-deck-key={slot.key}
        onPointerDown={front ? begin : undefined} onPointerMove={front ? move : undefined} onPointerUp={front ? end : undefined} onPointerCancel={front ? cancel : undefined}
        onLostPointerCapture={front ? () => { if (drag.current) cancel() } : undefined}
        style={{ transform, opacity: role === 'buffered' ? promotion : 1 }}>
        <Image src={item.dish.image} alt={front ? item.dish.name : ''} draggable="false" loading="eager" />
        <span className="surprise-swipe-cue surprise-swipe-skip" aria-hidden="true" style={{ opacity: front && offset < 0 ? amount : 0 }}>← Not this one</span>
        <span className="surprise-swipe-cue surprise-swipe-try" aria-hidden="true" style={{ opacity: front && offset > 0 ? amount : 0 }}>Try this →</span>
        <div><p className="surprise-eyebrow">Your next food adventure</p><h2><DishTitle dish={item.dish} /></h2><p>{item.dish.shortDescription}</p></div>
      </article>})}
    </div>
    <div className="surprise-controls"><Button variant="secondary" aria-disabled={!!exit} onClick={() => choose('skip')}>Not this one</Button><Button aria-disabled={!!exit} onClick={() => choose('select')}>Try this</Button></div>
    {onUndo && <div className="surprise-undo"><button type="button" disabled={!canUndo} aria-disabled={!!exit || !canUndo} onClick={() => choose('previous')}>↶ Undo skip</button></div>}
  </>
}
