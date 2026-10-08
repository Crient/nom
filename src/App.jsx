import { BrowserRouter, useLocation, useRoutes } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/Auth'
import { LocalDataProvider } from './context/LocalData'
import { createJourneyStore } from './data/syncEngine'
import { createCloudRepository } from './data/cloudRepository'
import GuestMigration from './components/account/GuestMigration'
import './styles/account.css'
import { DiscoverySessionProvider } from './context/DiscoverySession'
import { FavoritesProvider } from './context/Favorites'
import { ExperienceProvider } from './context/Experience'
import { ActivityProvider } from './context/Activity'
import { FriendsProvider } from './context/Friends'
import { routes } from './routes'

function AppRoutes() {
  return useRoutes(routes)
}

function JourneyBoundary() {
  const auth = useAuth()
  const { pathname } = useLocation()
  if (!auth.authReady) return <main className="account-loading" role="status">Getting your Nom journey ready…</main>
  // Callback/reset screens must survive the Guest → user auth event while
  // exchanging their single-use PKCE code. Normal data scopes still remount.
  if (pathname === '/auth/callback' || pathname === '/account/reset-password') return <AppRoutes />
  return <ScopedJourney key={auth.user?.id ?? 'guest'} user={auth.user} client={auth.client} />
}

function ScopedJourney({ user, client }) {
  const [store] = useState(() => createJourneyStore({ user, repository: user && client ? createCloudRepository(client, user.id, user.user_metadata?.avatar_url) : null }))
  return <LocalDataProvider store={store}><DiscoverySessionProvider><FavoritesProvider><ExperienceProvider><ActivityProvider>
    <FriendsProvider><AppRoutes /><GuestMigration /></FriendsProvider>
  </ActivityProvider></ExperienceProvider></FavoritesProvider></DiscoverySessionProvider></LocalDataProvider>
}

export default function App({ supabaseClient }) {
  return (
    <BrowserRouter>
      <AuthProvider client={supabaseClient}><JourneyBoundary /></AuthProvider>
    </BrowserRouter>
  )
}
