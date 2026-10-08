import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import Button from '../components/ui/Button'
import { SocialAvatar } from '../components/social/FriendPicker'
import { useAuth } from '../context/Auth'
import { useFriends } from '../context/Friends'
import { useActivity } from '../context/Activity'
import '../components/social/social.css'

export function FriendsAccountRequired() {
  return <section className="hub-empty"><p>Sign in to find friends and receive shares on Nom.</p><Link className="hub-action" to="/account?returnTo=%2Ffriends">Sign in or create account</Link></section>
}
function Person({ person, children }) {
  return <div><div className="social-person"><SocialAvatar name={person.display_name} /><span><strong>{person.display_name}</strong><small>@{person.handle}</small></span></div><div className="social-row-actions">{children}</div></div>
}
export default function Friends() {
  const auth = useAuth(), social = useFriends(), activity = useActivity()
  const [handle, setHandle] = useState(''), [name, setName] = useState(activity.displayName ?? '')
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [remove, setRemove] = useState(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (social.profile) setName(social.profile.display_name) }, [social.profile?.display_name])
  async function perform(operation, message = '') {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await operation(); if (alive.current) setNotice(message) }
    catch (failure) { if (alive.current) setError(failure.message) }
    finally { if (alive.current) setBusy(false) }
  }
  return <HubLayout title="Friends" backTo="/profile">
    {!auth.isAuthenticated ? <FriendsAccountRequired /> : <>
      <Link className="hub-action" to="/friends/inbox">Shared with you {social.unread > 0 && <span className="social-badge">{social.unread} unread</span>}</Link>
      {social.status === 'loading' && <p role="status">Loading Friends…</p>}
      {social.error && <section className="hub-section"><p role="alert">{social.error}</p><Button onClick={social.refresh}>Try again</Button></section>}
      {social.status === 'ready' && !social.profile && <form className="hub-section social-identity" onSubmit={event => { event.preventDefault(); perform(() => social.register(handle, name), 'Your Nom friend identity is ready.') }}>
        <h2>Your Nom friend identity</h2><p>Your handle and this name will be searchable by signed-in Nom users. Your email and account details stay private.</p>
        <label>Public handle<input required pattern="[a-z][a-z0-9_]{2,23}" minLength={3} maxLength={24} value={handle} onChange={event => setHandle(event.target.value.toLowerCase())} autoCapitalize="none" autoComplete="off" /></label>
        <small>3–24 characters; start with a letter. Lowercase letters, numbers and underscores. Your handle stays fixed.</small>
        <label>Public display name<input required value={name} onChange={event => setName(event.target.value)} maxLength={40} /></label>
        <Button type="submit" disabled={busy || !name.trim() || !/^[a-z][a-z0-9_]{2,23}$/.test(handle)}>Create friend identity</Button>
      </form>}
      {social.profile && <>
        <p>Your Nom handle: <strong>@{social.profile.handle}</strong></p>
        <form className="hub-section social-search" onSubmit={event => { event.preventDefault(); perform(async () => { const people = await social.search(query.trim()); if (alive.current) { setResults(people); setSearched(true) } }) }}>
          <h2>Search Nom users</h2><label>Display name or handle<input value={query} onChange={event => { setQuery(event.target.value); setSearched(false) }} minLength={2} maxLength={40} /></label>
          <small>Enter at least two starting characters.</small><Button type="submit" disabled={busy || query.trim().length < 2}>Search</Button>
          {searched && !results.length && <p>No matching Nom users found.</p>}
          {searched && <div className="social-list">{results.map(person => {
            const friend = social.friends.some(item => item.handle === person.handle), incoming = social.incoming.find(item => item.handle === person.handle), outgoing = social.outgoing.some(item => item.handle === person.handle)
            return <Person key={person.handle} person={person}>{friend ? <small>Friends</small> : incoming ? <small>Incoming request — respond below</small> : outgoing ? <small>Request sent</small> : <button type="button" disabled={busy} onClick={() => perform(() => social.request(person.handle), `Friend request sent to ${person.display_name}.`)}>Send friend request</button>}</Person>
          })}</div>}
        </form>
        <section className="hub-section"><h2>Incoming requests</h2><div className="social-list">{social.incoming.length ? social.incoming.map(person => <Person key={person.id} person={person}><button type="button" disabled={busy} onClick={() => perform(() => social.respond(person.id, true), `You and ${person.display_name} are now friends.`)}>Accept</button><button type="button" disabled={busy} onClick={() => perform(() => social.respond(person.id, false), 'Request declined.')}>Decline</button></Person>) : <p>No incoming requests.</p>}</div></section>
        <section className="hub-section"><h2>Outgoing requests</h2><div className="social-list">{social.outgoing.length ? social.outgoing.map(person => <Person key={person.id} person={person}><small>Pending</small><button type="button" disabled={busy} onClick={() => perform(() => social.cancel(person.id), 'Request cancelled.')}>Cancel request</button></Person>) : <p>No outgoing requests.</p>}</div></section>
        <section className="hub-section"><h2>Your friends</h2><div className="social-list">{social.friends.length ? social.friends.map(person => <Person key={person.handle} person={person}>{remove === person.handle ? <><p>Remove {person.display_name} from your friends?</p><button type="button" disabled={busy} onClick={() => perform(async () => { await social.remove(person.handle); if (alive.current) setRemove(null) }, 'Friend removed.')}>Confirm removal</button><button type="button" onClick={() => setRemove(null)}>Cancel</button></> : <button type="button" onClick={() => setRemove(person.handle)}>Remove friend</button>}</Person>) : <><p>No friends yet.</p><p>Search for someone on Nom to get started.</p></>}</div></section>
        <form className="hub-section social-identity" onSubmit={event => { event.preventDefault(); perform(() => social.register(social.profile.handle, name), 'Public name updated.') }}><h2>Public name</h2><label>Public display name<input value={name} maxLength={40} onChange={event => setName(event.target.value)} /></label><Button type="submit" disabled={busy || !name.trim()}>Update public name</Button></form>
      </>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
      <Button variant="secondary" disabled={busy} onClick={social.refresh}>Refresh Friends</Button>
    </>}
  </HubLayout>
}
