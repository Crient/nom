import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/Auth'
import { useFriends } from '../../context/Friends'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import './social.css'

export function SocialAvatar({ name }) {
  return <span className="social-avatar" aria-hidden="true">{Array.from(name || '?')[0].toLocaleUpperCase()}</span>
}
export default function FriendPicker({ content, onClose }) {
  const id = useId(), auth = useAuth(), social = useFriends(), location = useLocation()
  const [query, setQuery] = useState(''), [selected, setSelected] = useState(''), [note, setNote] = useState('')
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState('')
  const retry = useRef(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  // Modal stays on the original screen, so external/native sharing is unaffected.
  const friends = social.friends.filter(friend => `${friend.display_name} ${friend.handle}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const selectedFriend = social.friends.find(friend => friend.handle === selected)
  async function send(event) {
    event.preventDefault()
    if (pending || !selectedFriend) return
    setPending(true); setError('')
    const signature = JSON.stringify([selected, content, note])
    if (retry.current?.signature !== signature) retry.current = { signature, id: crypto.randomUUID() }
    try {
      await social.send({ id: retry.current.id, receiver: selected, content, message: note })
      if (mounted.current) setSent(selectedFriend.display_name)
    } catch (failure) { if (mounted.current) setError(failure.message) }
    finally { if (mounted.current) setPending(false) }
  }
  return <Modal open onClose={pending ? undefined : onClose} labelledBy={id} className="social-sheet">
    <h2 id={id}>Send to a friend</h2>
    {!auth.isAuthenticated ? <><p>Sign in to send this to friends on Nom.</p><Link className="hub-action" to={`/account?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>Sign in or create account</Link><Button variant="secondary" onClick={onClose}>Cancel</Button></>
      : sent ? <><p role="status">Sent to {sent}</p><Button onClick={onClose}>Done</Button></>
        : <form onSubmit={send}>
          {social.status === 'loading' ? <p role="status">Loading friends…</p> : social.error ? <><p role="alert">{social.error}</p><Button variant="secondary" onClick={social.refresh}>Try again</Button></>
            : !social.profile ? <><p>Choose your public Nom handle to get started.</p><Link className="hub-action" to="/friends">Set up Friends</Link></>
              : !social.friends.length ? <><p>No friends yet. Accept a request or find someone on Nom.</p><Link className="hub-action" to="/friends">Find friends</Link></>
                : <><label>Search friends<input value={query} disabled={pending} onChange={event => { setQuery(event.target.value); setSelected('') }} /></label>
                  <div className="social-picker-list">{friends.map(friend => <button key={friend.handle} type="button" disabled={pending} className="social-person" aria-pressed={selected === friend.handle} onClick={() => setSelected(friend.handle)}><SocialAvatar name={friend.display_name} /><span><strong>{friend.display_name}</strong><small>@{friend.handle}</small></span></button>)}{!friends.length && <p>No friends match your search.</p>}</div>
                  <label>Optional short message<textarea value={note} disabled={pending} onChange={event => { if (Array.from(event.target.value).length <= 280) setNote(event.target.value) }} rows={2} /></label><small>{Array.from(note).length}/280</small>
                  {error && <p role="alert">{error}</p>}<Button type="submit" disabled={pending || !selectedFriend}>{pending ? 'Sending…' : 'Send'}</Button></>}
          <Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button>
        </form>}
  </Modal>
}
