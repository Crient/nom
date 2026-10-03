import { useEffect, useState } from 'react'
import { findRestaurantsForDish } from '../data/restaurantProvider'

export function useRestaurants(dishId) {
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState({ dishId: null, status: 'loading', restaurants: [] })
  useEffect(() => {
    if (!dishId) return
    const controller = new AbortController()
    setResult({ dishId, status: 'loading', restaurants: [] })
    Promise.resolve().then(() => findRestaurantsForDish({ dishId, signal: controller.signal }))
      .then(data => {
        if (!controller.signal.aborted) setResult({ ...data, dishId, status: 'ready' })
      }).catch(() => {
        if (!controller.signal.aborted) setResult({ dishId, status: 'error', restaurants: [] })
      })
    return () => controller.abort()
  }, [dishId, retry])

  return {
    ...(result.dishId === dishId ? result : { status: 'loading', restaurants: [] }),
    retry: () => setRetry(value => value + 1),
  }
}
