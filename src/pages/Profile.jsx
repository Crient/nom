import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HubLayout, { SummaryGrid } from '../components/layout/HubLayout'
import Image from '../components/ui/Image'
import Button from '../components/ui/Button'
import SessionChip from '../components/recommendations/SessionChip'
import { useActivity } from '../context/Activity'
import { useExperience } from '../context/Experience'
import { useFavorites } from '../context/Favorites'
import { useDiscoverySession } from '../context/DiscoverySession'
import { explorationSummary } from '../utils/explorationSummary'
import { formatSessionChips } from '../utils/sessionChips'
import { rewardQaEnabled } from '../utils/rewardQa'
import { useAuth } from '../context/Auth'
import SyncStatus from '../components/account/SyncStatus'
import ziggy from '../assets/mascots/ziggy.webp'

export default function Profile() {
  const activity = useActivity(), { state } = useExperience(), favorites = useFavorites(), session = useDiscoverySession()
  const auth = useAuth()
  const [name, setName] = useState(activity.displayName), [saved, setSaved] = useState(false)
  useEffect(() => { setName(activity.displayName) }, [activity.displayName])
  const summary = explorationSummary(state, activity.recentDishes), chips = formatSessionChips(session)
  return <HubLayout title="Your" accent="Profile">
    <div className="profile-intro"><Image src={auth.user?.user_metadata?.avatar_url?.startsWith('https://') ? auth.user.user_metadata.avatar_url : ziggy} alt="Ziggy, Nom’s mascot" /><div><h2>{activity.displayName}</h2><p>{auth.isAuthenticated ? auth.user.email : 'Guest explorer'}</p><small>{auth.isAuthenticated ? `Signed in with ${auth.user.app_metadata?.provider === 'google' ? 'Google' : 'email'}` : 'Your profile stays on this device.'}</small></div></div>
    <SyncStatus /><Link className="hub-action" to="/account">{auth.isAuthenticated ? 'Account settings & sign out' : 'Sign in to sync your journey'}</Link>
    <SummaryGrid items={[["Dishes explored", summary.dishesExplored, '/history?view=views'], ['Meals logged', summary.meals, '/history?view=meals'], ['Countries explored', summary.countriesExplored, '/progress'], ['Saved dishes', favorites.favoriteIds.length, '/favorites?view=dishes']]} />
    <nav className="profile-links" aria-label="Your Nom destinations">{[['Favorites', '/favorites', `${favorites.favoriteIds.length} dishes · ${favorites.restaurantIds.length} restaurants · ${state.favorites.length} collectibles`], ['Progress', '/progress', 'Country progress and your next reward'], ['Collections', '/collections', `${summary.collectibles} collectibles`], ['History', '/history', 'Dishes explored and meals logged']].map(([label, to, detail]) => <Link key={to} aria-label={label} to={to} state={{ returnTo: '/profile' }}><strong>{label}</strong><small>{detail}</small><span aria-hidden="true">›</span></Link>)}</nav>
    <section className="hub-section"><h2>Discovery preferences</h2>{chips.length ? <div className="hub-chips">{chips.map(chip => <SessionChip key={chip.id} chip={chip} variant="nearby" />)}</div> : <p>You haven’t chosen your preferences yet.</p>}<Link className="hub-action" to="/discover/food-type">Adjust preferences</Link></section>
    <form className="hub-section" onSubmit={event => { event.preventDefault(); activity.setDisplayName(name); setSaved(true) }}><h2>{auth.isAuthenticated ? 'Profile settings' : 'Local settings'}</h2><label htmlFor="display-name">Display name</label><input id="display-name" value={name} maxLength={40} onChange={event => { setName(event.target.value); setSaved(false) }} /><Button type="submit" disabled={!name.trim()}>Save name</Button>{saved && <p role="status">{auth.isAuthenticated ? 'Name saved. Account sync will follow.' : 'Name saved on this device.'}</p>}</form>
    <Link className="hub-action" to="/image-credits">Dish photo credits</Link>
    {rewardQaEnabled() && <section className="hub-section"><h2>Developer tools</h2><p>Preview rewards and the experience journey with isolated test progress.</p><Link className="hub-action" to="/dev/rewards">Reward playground</Link><Link className="hub-action" to="/dev/experience">Experience flow playground</Link></section>}
    <p className="flow-demo">{auth.isAuthenticated ? 'Favorites, meals, and rewards sync with your account. Discovery answers and unfinished visits stay on this device.' : 'Guest favorites and progress save on this device when storage is available. Sign in whenever you want to sync.'}</p>
  </HubLayout>
}
