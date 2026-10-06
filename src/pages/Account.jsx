import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import SyncStatus from '../components/account/SyncStatus'
import { useAuth } from '../context/Auth'
import { useAccountSync } from '../context/LocalData'
import { clearAccountCache } from '../data/identityStorage'
import { safeAccountReturn } from '../utils/accountNavigation'

function AccountSettings() {
  const auth = useAuth(), navigate = useNavigate()
  const sync = useAccountSync()
  const [deleteReady, setDeleteReady] = useState(false), [open, setOpen] = useState(false), [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(null)
  useEffect(() => {
    let alive = true
    fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' }).then(async response => response.ok ? response.json() : null)
      .then(data => { if (alive) setDeleteReady(data?.deletionConfigured === true) }).catch(() => {})
    return () => { alive = false }
  }, [])
  async function signOut() {
    setBusy(true); setError(null)
    try { await auth.signOut(); navigate('/profile', { replace: true }) } catch { setError('Couldn’t sign out. Please retry.'); setBusy(false) }
  }
  async function removeAccount() {
    if (confirmation !== 'DELETE' || !deleteReady || busy) return
    setBusy(true); setError(null)
    try {
      const fresh = await auth.client.auth.getSession()
      const token = fresh.data.session?.access_token
      if (!token || fresh.data.session.user.id !== auth.user.id) throw new Error('Session changed')
      const response = await fetch('/api/account', { method: 'DELETE', credentials: 'same-origin', headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok || (await response.json()).deleted !== true) throw new Error('Delete failed')
      sync.stopSync?.()
      clearAccountCache(auth.user.id)
      await auth.signOut({ forceLocal: true })
      navigate('/home', { replace: true })
    } catch { setError('Account deletion could not be completed. Sign in again or retry after checking the server setup.'); setBusy(false) }
  }
  return <>
    <section className="hub-section"><h2>Your account</h2><p>{auth.user.email}</p><SyncStatus /><Button variant="secondary" disabled={busy} onClick={signOut}>Sign out</Button></section>
    <section className="hub-section"><h2>Delete account</h2><p>Delete your synced profile, favorites, meals, and reward history. Your Guest journey on this device remains available.</p>
      {!deleteReady && <p role="status">Account deletion is unavailable until the server is configured. Contact the app owner to request deletion.</p>}
      <button className="account-danger" disabled={!deleteReady || busy} onClick={() => setOpen(true)}>Delete account…</button>
    </section>
    {error && <p role="alert">{error}</p>}
    <Modal open={open} labelledBy="delete-account-title" onClose={() => { if (!busy) setOpen(false) }} className="account-modal">
      <h2 id="delete-account-title">Permanently delete your account?</h2><p>Your synced Nom data will be removed. This cannot be undone.</p>
      <label htmlFor="delete-confirmation">Type DELETE to confirm</label><input id="delete-confirmation" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button className="account-danger" disabled={confirmation !== 'DELETE' || busy || !deleteReady} onClick={removeAccount}>{busy ? 'Deleting…' : 'Permanently delete account'}</button>
      <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
    </Modal>
  </>
}

export default function Account() {
  const auth = useAuth(), navigate = useNavigate(), [params] = useSearchParams()
  const next = safeAccountReturn(params.get('returnTo'))
  const [mode, setMode] = useState('signin'), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(null), [error, setError] = useState(null)
  const enabled = auth.supabaseConfigured && Boolean(auth.client) && !busy
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(null); setError(null)
    try {
      if (mode === 'reset') { await auth.sendPasswordReset(email.trim()); setMessage('If an account exists for this email, a reset link is on its way. Open it in this browser.') }
      else if (mode === 'signup') {
        const data = await auth.signUpWithEmail(email.trim(), password, next)
        if (data.session) navigate(next, { replace: true })
        else setMessage('Check your email to confirm your account. Open the link in this browser, then sign in.')
      } else { await auth.signInWithEmail(email.trim(), password); navigate(next, { replace: true }) }
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function google() {
    setBusy(true); setError(null)
    try { await auth.signInWithGoogle(next) } catch (failure) { setError(failure.message); setBusy(false) }
  }
  return <HubLayout title="Your" accent="Account"><div className="account-page">
    {auth.isAuthenticated ? <AccountSettings /> : <>
      <h2>Take your Nom journey with you</h2><p>Sign in to sync favorites, meals, progress, and collections across devices. You can keep exploring as Guest.</p>
      {!auth.supabaseConfigured && <p role="status">Account sync is not configured in this build. Your Guest journey saves on this device.</p>}
      <Button disabled={!enabled} onClick={google}>Continue with Google</Button>
      <nav className="account-tabs" aria-label="Account options">{[['signin', 'Sign in'], ['signup', 'Create account'], ['reset', 'Reset password']].map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} disabled={busy} onClick={() => { setMode(key); setMessage(null); setError(null) }}>{label}</button>)}</nav>
      <form className="account-form" onSubmit={submit} aria-busy={busy}>
        <label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={!enabled} />
        {mode !== 'reset' && <><label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} required value={password} onChange={event => setPassword(event.target.value)} disabled={!enabled} />{mode === 'signup' && <small>Use at least 8 characters.</small>}</>}
        <Button type="submit" disabled={!enabled}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</Button>
      </form>
      {message && <p role="status">{message}</p>}{(error || auth.authError) && <p role="alert">{error || auth.authError}</p>}
    </>}
    <Link className="hub-action" to="/home">Continue exploring</Link><Link className="hub-action" to="/privacy">Privacy &amp; account data</Link>
  </div></HubLayout>
}
