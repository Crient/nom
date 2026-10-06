import { useState } from 'react'
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
import ziggy from '../assets/mascots/ziggy.webp'

export default function Profile() {
  const activity = useActivity(), { state } = useExperience(), favorites = useFavorites(), session = useDiscoverySession()
  const [name, setName] = useState(activity.displayName), [saved, setSaved] = useState(false)
  const summary = explorationSummary(state, activity.recentDishes), chips = formatSessionChips(session)
  return <HubLayout title="Your" accent="Profile">
    <div className="profile-intro"><Image src={ziggy} alt="Ziggy, Nom’s mascot" /><div><h2>{activity.displayName}</h2><p>Local explorer</p><small>Your profile stays on this device.</small></div></div>
    <SummaryGrid items={[["Dishes explored", summary.dishesExplored], ['Meals logged', summary.meals], ['Countries explored', summary.countriesExplored], ['Saved dishes', favorites.favoriteIds.length]]} />
    <nav className="profile-links" aria-label="Your Nom destinations">{[['Favorites', '/favorites', `${favorites.favoriteIds.length} dishes · ${favorites.restaurantIds.length} restaurants · ${state.favorites.length} collectibles`], ['Progress', '/progress', 'Country progress and your next reward'], ['Collections', '/collections', `${summary.collectibles} collectibles, including demo unlocks`], ['History', '/history', 'Dishes explored and meals logged']].map(([label, to, detail]) => <Link key={to} aria-label={label} to={to} state={{ returnTo: '/profile' }}><strong>{label}</strong><small>{detail}</small><span aria-hidden="true">›</span></Link>)}</nav>
    <section className="hub-section"><h2>Discovery preferences</h2>{chips.length ? <div className="hub-chips">{chips.map(chip => <SessionChip key={chip.id} chip={chip} variant="nearby" />)}</div> : <p>You haven’t chosen your preferences yet.</p>}<Link className="hub-action" to="/discover/food-type">Adjust preferences</Link></section>
    <form className="hub-section" onSubmit={event => { event.preventDefault(); activity.setDisplayName(name); setSaved(true) }}><h2>Local settings</h2><label htmlFor="display-name">Display name</label><input id="display-name" value={name} maxLength={40} onChange={event => { setName(event.target.value); setSaved(false) }} /><Button type="submit" disabled={!name.trim()}>Save name</Button>{saved && <p role="status">Name saved on this device.</p>}</form>
    <Link className="hub-action" to="/image-credits">Dish photo credits</Link>
    {import.meta.env.DEV && <section className="hub-section"><h2>Developer tools</h2><p>Preview reward animations with isolated test progress.</p><Link className="hub-action" to="/dev/rewards">Reward playground</Link></section>}
    <p className="flow-demo">No account, sign-in, or social profile is connected. Preferences, favorites, and progress save locally when storage is available.</p>
  </HubLayout>
}
