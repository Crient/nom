import { createContext, useContext, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

// Only the flag-gated playground supplies this memory-only route/fixture scope.
// Real routes continue to use the application's router and restaurant provider.
export const ExperienceFlowContext = createContext(null)
export const useExperiencePreview = () => useContext(ExperienceFlowContext)

export function useExperienceRoute() {
  const preview = useExperiencePreview()
  const params = useParams(), navigate = useNavigate(), location = useLocation()
  return preview ?? { params, navigate, location }
}

export function ExperienceNavigate(props) {
  const preview = useExperiencePreview()
  useEffect(() => {
    if (preview) preview.navigate(props.to, { replace: props.replace, state: props.state })
  }, [preview?.navigate, props.to, props.replace, props.state])
  return preview ? null : <Navigate {...props} />
}
