import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { discoveryDestination, recommendationReturnTo } from '../utils/navigation'

/** Carry a saved/search dish selection through the existing four questions. */
export function useDiscoveryNavigation() {
  const location = useLocation(), navigate = useNavigate()
  const go = useCallback((to, options = {}) => navigate(to, { ...options, state: options.state ?? location.state }), [navigate, location.state])
  const finish = () => navigate(discoveryDestination(location.state?.discoveryReturnTo), { state: { returnTo: recommendationReturnTo(location.state?.returnTo), surpriseMode: location.state?.surpriseMode } })
  return { go, finish }
}
