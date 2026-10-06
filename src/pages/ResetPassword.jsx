import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import Button from '../components/ui/Button'
import { useAuth } from '../context/Auth'

export default function ResetPassword() {
  const auth = useAuth(), [ready, setReady] = useState(false), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [done, setDone] = useState(false)
  useEffect(() => {
    let alive = true
    const params = new URLSearchParams(window.location.search), code = params.get('code')
    if (!auth.client || !code || params.has('error')) { setError('This reset link is missing or expired. Request a new link from Account.'); return }
    auth.completeCallback(code).then(() => { if (alive) { window.history.replaceState(null, '', '/account/reset-password'); setReady(true) } })
      .catch(() => { if (alive) { window.history.replaceState(null, '', '/account/reset-password'); setError('This reset link could not be verified. Request a new link and open it in this browser.') } })
    return () => { alive = false }
  }, [auth.client, auth.completeCallback])
  async function submit(event) {
    event.preventDefault(); setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try { await auth.updatePassword(password); setDone(true); setPassword(''); setConfirm('') } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <HubLayout title="Reset" accent="Password"><div className="account-page">
    {done ? <p role="status">Password updated. Your account is ready.</p> : ready ? <form className="account-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="reset-password">New password</label><input id="reset-password" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} />
      <label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirm} onChange={event => setConfirm(event.target.value)} />
      <Button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button>
    </form> : !error && <p role="status">Checking your reset link…</p>}
    {error && <p role="alert">{error}</p>}<Link className="hub-action" to="/account">Back to Account</Link>
  </div></HubLayout>
}
