import { ADVENTURE_LEVEL, isSurpriseMe } from './recommendationEngine'

export function surpriseContextKey(session) {
  return JSON.stringify([session.foodType, [...(session.flavors ?? [])].sort(), session.adventurousness, session.region])
}

/** Surprise eligibility is separate from the deterministic recommendation order. */
export function surpriseCandidates(session, results) {
  const eligible = results.filter(({ dish }) =>
    (!session.foodType || session.foodType === 'anything' || dish.foodType === session.foodType)
    && (!session.region || isSurpriseMe(session.region) || dish.region === session.region)
    && (!(session.flavors?.length) || session.flavors.some(flavor => dish.preferenceFlavors.includes(flavor)))
    && (!ADVENTURE_LEVEL[session.adventurousness] || Math.abs(dish.adventureLevel - ADVENTURE_LEVEL[session.adventurousness]) <= 1),
  )
  const bestScore = Math.max(...eligible.map(result => result.score))
  // With only flavor scoring active, a two-flavor partial match scores 50.
  // Excluding it would reduce common Surprise contexts to a single perfect dish.
  return eligible.filter(result => result.score >= Math.max(bestScore / 2, bestScore - 50))
}

/** Weighted sampling without replacement. Only one active preference context is kept. */
export function createSurpriseSession({ random = Math.random } = {}) {
  let context = null, queue = [], preparedCycle = null, shown = new Set(), lastId = null, newCycle = false, history = [], position = -1
  const weightedQueue = (pool, avoidId) => {
    const draw = pool.map(result => ({ result,
      priority: -Math.log(Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, random()))) / Math.max(1, result.score) ** 2,
    })).sort((a, b) => a.priority - b.priority).map(item => item.result)
    if (draw.length > 1 && draw[0].dish.id === avoidId) draw.push(draw.shift())
    return draw
  }
  const prepare = (session, results) => {
      const pool = surpriseCandidates(session, results), key = surpriseContextKey(session)
      if (context !== key) { context = key; queue = []; preparedCycle = null; shown.clear(); lastId = null; newCycle = false; history = []; position = -1 }
      if (!pool.length) { queue = []; preparedCycle = null; return pool }
      const ids = new Set(pool.map(result => result.dish.id))
      queue = queue.filter(result => ids.has(result.dish.id))
      if (preparedCycle && (preparedCycle.length !== pool.length || preparedCycle.some(result => !ids.has(result.dish.id)))) preparedCycle = null
      const retainedPosition = history.slice(0, position + 1).filter(result => ids.has(result.dish.id)).length - 1
      history = history.filter(result => ids.has(result.dish.id)); position = retainedPosition
      if (!queue.length) {
        let remaining = pool.filter(result => !shown.has(result.dish.id))
        if (!remaining.length) { newCycle = true; remaining = pool }
        queue = newCycle && preparedCycle ? preparedCycle : weightedQueue(remaining, lastId)
        preparedCycle = null
        if (queue.length > 1 && queue[0].dish.id === lastId) queue.push(queue.shift())
      }
      return pool
  }
  return {
    peek(session, results, offset = 0) {
      // Preparing a preview never records a shown dish or consumes a new cycle.
      const pool = prepare(session, results)
      if (pool.length < 2 || !Number.isInteger(offset) || offset < 0 || offset > 1) return null
      const upcoming = [...history.slice(position + 1), ...queue]
      if (upcoming[offset]) return upcoming[offset]
      // Prepare the next cycle once, without recording a shown dish or moving
      // history. Reuse that same weighted draw when the current cycle ends.
      preparedCycle ??= weightedQueue(pool, upcoming.at(-1)?.dish.id ?? lastId)
      return preparedCycle[offset - upcoming.length] ?? null
    },
    next(session, results) {
      if (!prepare(session, results).length) return null
      // Undo only moves through already shown cards. Advancing again replays
      // the same next card before drawing new ones, without changing the queue.
      if (position < history.length - 1) {
        const result = history[++position]
        lastId = result.dish.id
        return result
      }
      if (newCycle) { shown.clear(); newCycle = false }
      const result = queue.shift()
      shown.add(result.dish.id); lastId = result.dish.id
      history.push(result); position = history.length - 1
      // Keep previous navigation lightweight during unusually long sessions.
      if (history.length > 100) { history.shift(); position -= 1 }
      return result
    },
    canGoBack(session) { return context === surpriseContextKey(session) && position > 0 },
    previous(session, results) {
      const pool = prepare(session, results), ids = new Set(pool.map(result => result.dish.id))
      let previous = position - 1
      while (previous >= 0 && !ids.has(history[previous].dish.id)) previous -= 1
      if (previous < 0) return null
      position = previous; lastId = history[position].dish.id
      return history[position]
    },
    reset() { context = null; queue = []; preparedCycle = null; shown.clear(); lastId = null; newCycle = false; history = []; position = -1 },
  }
}

// Ephemeral tab memory: no behavioral history is written to durable storage.
export const surpriseSession = createSurpriseSession()
