import { useMemo } from 'react'
import { useDiscoverySession } from '../context/DiscoverySession'
import { dishes } from '../data/dishes'
import { recommend } from '../utils/recommendationEngine'
import { formatSessionChips } from '../utils/sessionChips'

export function hasRequiredDiscovery(session) {
  return Boolean(
    session.foodType &&
      session.adventurousness &&
      Array.isArray(session.flavors) &&
      session.flavors.length > 0,
  )
}

/** All recommendation screens consume the same full ranking and session chips. */
export function useRecommendations() {
  const session = useDiscoverySession()
  const ready = hasRequiredDiscovery(session)
  const results = useMemo(() => (ready ? recommend(session, dishes) : []), [ready, session])
  const chips = useMemo(() => formatSessionChips(session), [session])

  return { ready, results, chips }
}
