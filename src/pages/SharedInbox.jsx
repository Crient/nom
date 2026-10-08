import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HubLayout from '../components/layout/HubLayout'
import Button from '../components/ui/Button'
import { SocialAvatar } from '../components/social/FriendPicker'
import { FriendsAccountRequired } from './Friends'
import { useAuth } from '../context/Auth'
import { useFriends } from '../context/Friends'
import { sharedItemDestination, sharedItemTitle } from '../data/sharedContent'
import { placeDetailsService } from '../data/placeExtrasService'
import '../components/social/social.css'
export default function SharedInbox() {
  const auth = useAuth(), social = useFriends(), navigate = useNavigate()
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function perform(operation) {
    if (busy) return
    setBusy(true); setError('')
    try { await operation() } catch (failure) { if (alive.current) setError(failure.message) }
    finally { if (alive.current) setBusy(false) }
  }
  return <HubLayout title="Shared" accent="with you" backTo="/friends">
    {!auth.isAuthenticated ? <FriendsAccountRequired /> : <>
      <Link className="hub-action" to="/friends">Your friends</Link>
      {social.status === 'loading' && <p role="status">Loading shares…</p>}
      {(error || social.error) && <p role="alert">{error || social.error}</p>}
      {social.status === 'ready' && !social.profile && <p>Choose your public handle in Friends to receive shares.</p>}
      {social.status === 'ready' && !social.inbox.length && <section className="hub-empty"><p>Nothing shared yet.</p><p>Things your Nom friends send will appear here.</p></section>}
      <div className="social-list">{social.inbox.map(item => {
        const destination = sharedItemDestination(item)
        return <article key={item.id} className="social-share-card" data-unread={!item.opened_at}>
          <div className="social-person"><SocialAvatar name={item.sender_name} /><span><strong>{item.sender_name} sent you a {item.content_type}</strong><small>@{item.sender_handle}</small></span></div>
          <h2>{sharedItemTitle(item)}</h2>{item.message && <blockquote>{item.message}</blockquote>}
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time><small>{item.opened_at ? 'Opened' : 'Unread'}</small>
          {destination ? <Button disabled={busy} onClick={() => perform(async () => {
            await social.open(item.id)
            if (!alive.current) return
            // Resolve current restaurant details on opening only; never store a Places payload in shares.
            if (item.content_type === 'restaurant') placeDetailsService.load(item.content_id.slice(7))
            navigate(destination, { state: { returnTo: '/friends/inbox' } })
          })}>Open</Button> : <><p>This item is no longer available.</p>{!item.opened_at && <Button variant="secondary" disabled={busy} onClick={() => perform(() => social.open(item.id))}>Mark as read</Button>}</>}
        </article>
      })}</div>
      {social.hasMore && <Button disabled={busy} onClick={() => perform(social.loadMore)}>Load older shares</Button>}
      <Button variant="secondary" disabled={busy} onClick={social.refresh}>Refresh inbox</Button>
    </>}
  </HubLayout>
}
