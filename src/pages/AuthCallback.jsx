import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import { useAuth } from '../context/Auth'
import { consumeAccountReturn } from '../utils/accountNavigation'

export default function AuthCallback() {
  const auth = useAuth(), navigate = useNavigate(), [error, setError] = useState(null)
  useEffect(() => {
    let alive = true
    const params = new URLSearchParams(window.location.search), code = params.get('code')
    if (!auth.client || params.has('error') || !code) { setError('This sign-in link is missing or expired. Start again from Account.'); return }
    auth.completeCallback(code).then(() => {
      if (!alive) return
      // Remove the one-time auth code before returning to the app.
      navigate(consumeAccountReturn(), { replace: true })
    }).catch(() => { if (alive) { window.history.replaceState(null, '', '/auth/callback'); setError('This sign-in link is expired or could not be verified. Start again from Account in this browser.') } })
    return () => { alive = false }
  }, [auth.client, auth.completeCallback, navigate])
  return <HubLayout title="Your" accent="Account">{error ? <p role="alert">{error}</p> : <p role="status">Completing sign-in…</p>}<Link className="hub-action" to="/account">Back to Account</Link></HubLayout>
}
