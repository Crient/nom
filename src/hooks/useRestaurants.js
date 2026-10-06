import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { restaurantSearchState } from '../data/restaurantSearchState'

export function useRestaurants(dishId, { autoLoad = false, revalidateLocation = autoLoad } = {}) {
  const subscribe = useCallback(callback => restaurantSearchState.subscribe(dishId, callback), [dishId])
  const getSnapshot = useCallback(() => restaurantSearchState.getSnapshot(dishId), [dishId])
  const result = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [checkingLocation, setCheckingLocation] = useState(autoLoad && result.status === 'idle')
  const search = useCallback(options => restaurantSearchState.search(dishId, options), [dishId])
  useEffect(() => {
    if (!revalidateLocation || !dishId) return
    const controller = new AbortController()
    restaurantSearchState.revalidateCached(dishId, { signal: controller.signal })
    return () => controller.abort()
  }, [dishId, revalidateLocation])
  useEffect(() => {
    if (!autoLoad || !dishId || result.status !== 'idle') { setCheckingLocation(false); return }
    const controller = new AbortController()
    setCheckingLocation(true)
    restaurantSearchState.autoSearch(dishId, { signal: controller.signal }).finally(() => {
      if (!controller.signal.aborted) setCheckingLocation(false)
    })
    return () => controller.abort()
  }, [dishId, autoLoad, result.status])
  return { ...result, search, retry: () => search({ refresh: true }),
    busy: checkingLocation || ['requesting-location', 'loading'].includes(result.status) }
}
