import { useEffect, useState } from 'react'
import { findRestaurant } from '../data/restaurantProvider'
import { useExperiencePreview } from '../context/ExperienceFlow'

export function useRestaurant(dishId, restaurantId) {
  const preview = useExperiencePreview()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState({ status: 'loading' })
  const key = `${dishId}:${restaurantId}`
  useEffect(() => {
    if (preview || !dishId || !restaurantId) return
    const controller = new AbortController()
    setResult({ key, status: 'loading' })
    Promise.resolve().then(() => findRestaurant({ dishId, restaurantId, signal: controller.signal }))
      .then(data => { if (!controller.signal.aborted) setResult({ ...data, key, status: 'ready' }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, status: 'error' }) })
    return () => controller.abort()
  }, [dishId, restaurantId, key, retry, preview])
  if (preview) return { restaurant: preview.restaurant, status: 'ready' }
  return { ...(result.key === key ? result : { status: 'loading' }), retry: () => setRetry(value => value + 1) }
}
